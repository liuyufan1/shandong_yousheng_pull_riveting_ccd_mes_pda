<script setup>
import { ref, onMounted, nextTick, watch, onBeforeUnmount } from 'vue'
import { Setting, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const barcodeInput = ref('')
const barcodeInputRef = ref(null)
const settingsVisible = ref(false)
const serverIp = ref('192.168.124.10')
const selectedMachine = ref('MS11抽芯拉铆左')
const logEntries = ref([])

const machineOptions = ref([
  { value: 'MS11抽芯拉铆左', label: 'MS11抽芯拉铆左' },
  { value: 'MS11抽芯拉铆右', label: 'MS11抽芯拉铆右' },
  { value: 'MX11抽芯拉铆左', label: 'MX11抽芯拉铆左' },
  { value: 'MX11抽芯拉铆右', label: 'MX11抽芯拉铆右' },
  { value: 'MS11CCD', label: 'MS11CCD' },
  { value: 'MX11CCD', label: 'MX11CCD' },
  { value: '伺服拉铆1', label: '伺服拉铆1' },
  { value: '伺服拉铆2', label: '伺服拉铆2' },
  { value: '伺服拉铆3', label: '伺服拉铆3' },
  { value: '伺服拉铆4', label: '伺服拉铆4' }
])

const loadSettings = () => {
  const savedSettings = localStorage.getItem('scannerSettings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      serverIp.value = settings.ip || '192.168.124.10'
      selectedMachine.value = settings.machine || 'MS11抽芯拉铆左'
    } catch (e) {
      console.error('加载设置失败:', e)
    }
  }
}

const saveSettings = () => {
  localStorage.setItem('scannerSettings', JSON.stringify({
    ip: serverIp.value,
    machine: selectedMachine.value
  }))
  settingsVisible.value = false
  ElMessage.success('设置已保存')
}

const formatDateTime = (date) => {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-')
}

const focusBarcodeInput = () => {
  if (!settingsVisible.value) {
    nextTick(() => {
      barcodeInputRef.value?.focus()
    })
  }
}

const sendBarcode = async () => {
  if (!barcodeInput.value.trim()) return

  const timestamp = new Date()
  const logEntry = {
    time: formatDateTime(timestamp),
    barcode: barcodeInput.value,
    machine: selectedMachine.value,
    status: '发送中...',
    response: null
  }

  logEntries.value.unshift(logEntry)
  await nextTick()

  const index = 0
  try {
    let barcode = barcodeInput.value
    barcodeInput.value = ''

    const response = await axios.put(
        `http://${serverIp.value}:8089/pdaScanner/`,
        {
          barcode: barcode,
          machineName: selectedMachine.value
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
    )

    logEntries.value[index] = {
      ...logEntries.value[index],
      status: '发送成功',
      response: response.data
    }

    ElMessage.success('发送成功')
  } catch (error) {
    let status = '发送失败'
    let respMsg = error.message

    if (error.code === 'ECONNABORTED') {
      status = '超时未响应'
      respMsg = '请求超时'
    } else if (error.response) {
      respMsg = `HTTP ${error.response.status}: ${error.response.statusText}`
    }

    logEntries.value[index] = {
      ...logEntries.value[index],
      status,
      response: respMsg
    }

    ElMessage.error(respMsg)
  } finally {
    focusBarcodeInput()
  }
}

const handleKeyInput = (e) => {
  const barcodeEl = document.querySelector('.barcode-input input')
  if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey &&
      !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
  ) {
    barcodeEl.focus()
  }

  if (e.key === 'Enter' && barcodeInput.value.trim()) {
    sendBarcode()
  }
}

watch(settingsVisible, (val) => {
  if (!val) {
    focusBarcodeInput()
  }
})

// 保持条码框焦点
const keepFocus = () => {
  if (!settingsVisible.value) {
    focusBarcodeInput()
  }
}

onMounted(() => {
  loadSettings()
  window.addEventListener('keydown', handleKeyInput)
  window.addEventListener('click', keepFocus, true)
  window.addEventListener('focusout', keepFocus, true)
  focusBarcodeInput()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyInput)
  window.removeEventListener('click', keepFocus, true)
  window.removeEventListener('focusout', keepFocus, true)
})
</script>

<template>
  <div class="barcode-container">
    <div class="barcode-input-area">
      <el-input
          ref="barcodeInputRef"
          v-model="barcodeInput"
          placeholder="请扫描条码..."
          class="barcode-input"
          @keyup.enter="sendBarcode"
      />
    </div>

    <div class="log-area">
      <div v-for="(log, index) in logEntries" :key="index" class="log-entry">
        <div class="log-header">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-status" :class="{
            'success': log.status === '发送成功',
            'error': log.status === '发送失败',
            'sending': log.status === '发送中...',
            'timeout': log.status === '超时未响应'
          }">
            {{ log.status }}
          </span>
        </div>
        <div class="log-details">
          <div>条码: {{ log.barcode }}</div>
          <div>机器: {{ log.machine }}</div>
          <div v-if="log.response">响应: {{ JSON.stringify(log.response) }}</div>
        </div>
      </div>
      <div v-if="logEntries.length === 0" class="empty-log">
        暂无发送记录
      </div>
    </div>

    <div class="action-area">
      <el-button
          type="primary"
          @click="sendBarcode"
          :disabled="!barcodeInput"
          class="send-btn"
      >
        <el-icon><ArrowRight /></el-icon>
        <span>发送条码</span>
      </el-button>
    </div>

    <el-button
        circle
        :icon="Setting"
        class="settings-btn"
        @click="settingsVisible = true"
    />

    <el-dialog
        v-model="settingsVisible"
        title="扫描设置"
        width="85%"
    >
      <div class="settings-content">
        <div class="setting-item">
          <span class="setting-label">服务器IP:</span>
          <el-input
              v-model="serverIp"
              placeholder="请输入服务器IP地址"
              clearable
              class="ip-input"
          />
        </div>

        <el-divider />

        <div class="setting-item">
          <span class="setting-label">机器类型:</span>
          <el-select
              v-model="selectedMachine"
              placeholder="请选择机器类型"
              class="machine-select"
          >
            <el-option
                v-for="item in machineOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            />
          </el-select>
        </div>
      </div>

      <template #footer>
        <el-button @click="saveSettings">保存设置</el-button>
        <el-button type="primary" @click="settingsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.barcode-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #f5f7fa;
}

.barcode-input-area {
  padding: 16px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.barcode-input :deep(.el-input__inner) {
  height: 48px;
  font-size: 16px;
  text-align: center;
  background: #f9f9f9;
}

.log-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: white;
  margin: 8px 16px;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.log-entry {
  padding: 12px;
  margin-bottom: 12px;
  border-left: 4px solid #e0e0e0;
  background: #fafafa;
}

.log-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.log-time {
  color: #666;
}

.log-status {
  font-weight: bold;
}

.log-status.success {
  color: #67c23a;
}

.log-status.error {
  color: #f56c6c;
}

.log-status.sending {
  color: #409eff;
}

.log-status.timeout {
  color: #e6a23c;
}

.log-details {
  font-size: 13px;
  color: #333;
  line-height: 1.6;
}

.empty-log {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.action-area {
  padding: 16px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

.send-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
}

.send-btn span {
  margin-left: 8px;
}

.settings-btn {
  position: fixed;
  top: 24px;
  right: 16px;
  z-index: 100;
  background: var(--el-color-primary);
  color: white;
  font-size: 18px;
}

.settings-content {
  padding: 0 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  margin: 20px 0;
  font-size: 15px;
}

.setting-label {
  width: 100px;
  margin-right: 15px;
  text-align: right;
}

.ip-input,
.machine-select {
  flex: 1;
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .setting-label {
    width: 100%;
    text-align: left;
    margin-bottom: 8px;
  }

  .ip-input,
  .machine-select {
    width: 100%;
  }
}
</style>
