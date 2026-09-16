<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2026 Nguyễn Tiến Lộc -->
<template>
  <!-- M53 2026-05-30: Trang cài đặt Trợ Lý AI cho Virtual Chat (KH no-Zalo).
       Admin edit prompt template, toggle on/off, đổi regex skip noise. -->
  <div class="ai-page">
    <header class="ai-page-header">
      <div>
        <h1 class="ai-page-title">🤖 Trợ lý AI cho Chat nội bộ</h1>
        <p class="ai-page-sub">
          Cấu hình prompt và quy tắc cho trợ lý gợi ý sale khai thác thông tin + tự động trích xuất dữ liệu KH.
        </p>
      </div>
      <div v-if="loading" class="loading-pill">⏳ Đang tải...</div>
    </header>

    <div v-if="config" class="ai-page-body">
      <!-- Toggle bật/tắt -->
      <div class="toggle-card">
        <label class="toggle-row">
          <input type="checkbox" v-model="config.aiAssistantEnabled" />
          <div>
            <div class="toggle-label">Bật trợ lý AI</div>
            <div class="toggle-hint">
              Khi tắt: virtual chat vẫn lưu nhật ký bình thường, nhưng AI sẽ không gợi ý + extract thông tin nữa.
            </div>
          </div>
        </label>
      </div>

      <!-- Provider info -->
      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Nhà cung cấp AI</span>
          <span class="info-value provider-selection">
            <select v-model="config.provider">
              <option v-for="provider in providers" :key="provider.id" :value="provider.id">{{ provider.name }}</option>
            </select>
            <input v-model="config.model" class="model-input" placeholder="Model" />
            <button class="btn-secondary compact-button" :disabled="saving" @click="saveAiProvider">Lưu</button>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Quota hôm nay</span>
          <span class="info-value">{{ usage?.usedToday ?? 0 }} / {{ config.maxDaily }} lượt</span>
        </div>
        <div class="info-row">
          <span class="info-label">Còn lại</span>
          <span class="info-value" :class="{ 'low-quota': lowQuota }">
            {{ usage?.remaining ?? config.maxDaily }} lượt
          </span>
        </div>
      </div>

      <div class="field-group">
        <div class="section-heading">
          <div>
            <div class="field-label">Cơ sở tri thức (Knowledge Base Repu Digital)</div>
            <div class="field-hint">Tài liệu sản phẩm, dịch vụ Digital Marketing, Martech & Automation để AI trả lời đúng chuyên môn.</div>
          </div>
          <button class="btn-primary" @click="openDocDialog()">＋ Thêm tài liệu</button>
        </div>
        <div v-if="knowledgeDocs.length" class="provider-table-wrap">
          <table class="provider-table">
            <thead><tr><th>Tiêu đề</th><th>Nội dung tóm tắt</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              <tr v-for="doc in knowledgeDocs" :key="doc.id">
                <td><strong>{{ doc.title }}</strong></td>
                <td class="url-cell">{{ doc.content }}</td>
                <td>{{ doc.isActive ? 'Bật' : 'Tắt' }}</td>
                <td class="provider-actions">
                  <button class="btn-link" @click="openDocDialog(doc)">Sửa</button>
                  <button class="btn-link danger" @click="removeDoc(doc)">Xóa</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">Chưa có tài liệu kiến thức. Hãy thêm thông tin dịch vụ của Repu Digital!</div>
      </div>

      <div class="field-group">
        <div class="section-heading">
          <div>
            <div class="field-label">Nhà cung cấp AI</div>
            <div class="field-hint">Thêm các API tương thích OpenAI để dùng cho trợ lý AI.</div>
          </div>
          <button class="btn-primary" @click="openProviderForm()">＋ Thêm provider</button>
        </div>
        <div v-if="providers.length" class="provider-table-wrap">
          <table class="provider-table">
            <thead><tr><th>Tên</th><th>Base URL</th><th>Model</th><th>API key</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>
              <tr v-for="provider in providers" :key="provider.id">
                <td>{{ provider.name }}<small v-if="provider.isCustom">Custom</small></td>
                <td class="url-cell">{{ provider.baseUrl }}</td>
                <td>{{ provider.model || '—' }}</td>
                <td>{{ provider.hasKey ? 'Đã cấu hình' : 'Chưa có' }}</td>
                <td>{{ provider.isActive === false ? 'Tắt' : 'Bật' }}</td>
                <td class="provider-actions" v-if="provider.isCustom">
                  <button class="btn-link" @click="openProviderForm(provider)">Sửa</button>
                  <button class="btn-link danger" @click="removeProvider(provider)">Xóa</button>
                </td>
                <td v-else>—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state">Chưa có provider custom.</div>
      </div>

      <!-- Prompt editor -->
      <div class="field-group">
        <label class="field-label">
          Prompt mẫu cho trợ lý AI
          <span class="field-meta">(anh edit để thay đổi cách AI nói chuyện với sale)</span>
        </label>
        <textarea
          v-model="config.aiAssistantPromptTemplate"
          class="prompt-editor"
          rows="20"
          spellcheck="false"
        />
        <div class="field-hint">
          Dùng markdown. Lưu thay đổi sẽ áp dụng ngay cho mọi sale trong tổ chức.
        </div>
      </div>

      <!-- Skip noise regex -->
      <div class="field-group">
        <label class="field-label">
          Quy tắc bỏ qua tin nhắn ngắn (regex)
          <span class="field-meta">(tiết kiệm token — AI không trả lời tin "ok", "ờ", "uhm"...)</span>
        </label>
        <input
          v-model="config.aiAssistantSkipNoisePattern"
          class="regex-input"
          spellcheck="false"
        />
        <div class="field-hint">
          Tin nhắn matching regex này sẽ KHÔNG kích hoạt AI. Mặc định bỏ qua "ok", "ờ", "uhm"...
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button class="btn-danger-ghost" @click="restoreDefault" :disabled="saving">
          ↺ Khôi phục prompt mặc định
        </button>
        <button class="btn-secondary" @click="testPromptOpen = true" :disabled="saving">
          🧪 Test prompt với tin nhắn mẫu
        </button>
        <button class="btn-primary" @click="save" :disabled="saving">
          {{ saving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt' }}
        </button>
      </div>

      <div v-if="saveMessage" class="save-msg" :class="saveOk ? 'ok' : 'err'">{{ saveMessage }}</div>
    </div>

    <div v-if="providerDialogOpen" class="modal-overlay" @click.self="providerDialogOpen = false">
      <div class="modal-body">
        <header class="modal-header">
          <div class="modal-traffic-lights">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <h3>{{ editingProvider ? 'Sửa nhà cung cấp tương thích' : 'Thêm nhà cung cấp tương thích với OpenAI' }}</h3>
          <button class="modal-close" @click="providerDialogOpen = false">✕</button>
        </header>
        <div class="modal-content provider-form">
          <div class="form-item">
            <label class="form-title">Tên</label>
            <input v-model="providerForm.name" placeholder="Cấu hình tương thích với OpenAI (môi trường sản xuất)" />
            <div class="form-desc">Bắt buộc. Nhãn dễ nhận biết cho nút này.</div>
          </div>

          <div class="form-item">
            <label class="form-title">Tiền tố</label>
            <input v-model="providerForm.slug" :disabled="!!editingProvider" placeholder="oc-prod" />
            <div class="form-desc">Bắt buộc. Tiền tố duy nhất cho tên mô hình.</div>
          </div>

          <div class="form-item">
            <label class="form-title">Loại API</label>
            <select v-model="providerForm.apiType" class="form-select">
              <option value="" disabled>Chọn một tùy chọn</option>
              <option value="chat_completions">Hoàn tất trò chuyện</option>
              <option value="responses">API Phản hồi</option>
            </select>
          </div>

          <div class="form-item">
            <label class="form-title">URL cơ sở</label>
            <input v-model="providerForm.baseUrl" placeholder="https://api.openai.com/v1" />
            <div class="form-desc">URL gốc của API tương thích với OpenAI của bạn. Sử dụng Cài đặt nâng cao cho các đường dẫn endpoint tùy chỉnh.</div>
          </div>

          <div class="form-item">
            <label class="form-title">API key (để kiểm tra)</label>
            <div class="api-key-row">
              <input v-model="providerForm.apiKey" type="password" :placeholder="editingProvider ? '••••••••' : ''" />
              <button type="button" class="btn-check" :disabled="testingConnection" @click="testProviderConnection">
                {{ testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra' }}
              </button>
            </div>
          </div>

          <div class="form-item">
            <label class="form-title">ID mô hình (tùy chọn)</label>
            <input v-model="providerForm.model" placeholder="Ví dụ: my-model-id" />
            <div class="form-desc">Nếu nhà cung cấp thiếu endpoint /models, hãy nhập ID mô hình để xác thực qua /chat/completions thay thế.</div>
          </div>

          <div v-if="testResult" class="test-feedback" :class="testResult.ok ? 'ok' : 'err'">
            {{ testResult.message }}
          </div>

          <div v-if="providerError" class="save-msg err">{{ providerError }}</div>

          <div class="actions compact">
            <button class="btn-primary main-action" :disabled="providerSaving" @click="saveProvider">
              {{ providerSaving ? 'Đang lưu...' : (editingProvider ? 'Cập nhật' : 'Thêm') }}
            </button>
            <button class="btn-cancel" @click="providerDialogOpen = false">Hủy</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Test prompt modal -->
    <div v-if="docDialogOpen" class="modal-overlay" @click.self="docDialogOpen = false">
      <div class="modal-body">
        <header class="modal-header">
          <div class="modal-traffic-lights">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <h3>{{ editingDoc ? 'Sửa tài liệu Knowledge Base' : 'Thêm tài liệu Knowledge Base' }}</h3>
          <button class="modal-close" @click="docDialogOpen = false">✕</button>
        </header>
        <div class="modal-content provider-form">
          <div class="form-item">
            <label class="form-title">Tiêu đề tài liệu</label>
            <input v-model="docForm.title" placeholder="Ví dụ: Giới thiệu dịch vụ Martech & Automation Repu Digital" />
          </div>
          <div class="form-item">
            <label class="form-title">Nội dung chi tiết (để AI tra cứu)</label>
            <textarea v-model="docForm.content" rows="6" placeholder="Nhập dịch vụ, bảng giá, quy trình, thông tin công ty..." class="doc-textarea" />
          </div>
          <label class="toggle-row">
            <input type="checkbox" v-model="docForm.isActive" /> Đang kích hoạt
          </label>
          <div v-if="docError" class="save-msg err">{{ docError }}</div>
          <div class="actions compact">
            <button class="btn-primary main-action" :disabled="docSaving" @click="saveDoc">
              {{ docSaving ? 'Đang lưu...' : (editingDoc ? 'Cập nhật' : 'Lưu tài liệu') }}
            </button>
            <button class="btn-cancel" @click="docDialogOpen = false">Hủy</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="testPromptOpen" class="modal-overlay" @click.self="testPromptOpen = false">
      <div class="modal-body">
        <header class="modal-header">
          <h3>🧪 Test prompt</h3>
          <button class="modal-close" @click="testPromptOpen = false">✕</button>
        </header>
        <div class="modal-content">
          <p class="modal-hint">
            Chức năng test prompt với tin nhắn mẫu sẽ ra mắt phiên bản kế tiếp.
            Hiện tại anh có thể test trực tiếp bằng cách mở 1 virtual chat (KH no-Zalo)
            và gửi tin để xem AI phản hồi.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '@/api/index';

interface AiAssistantConfig {
  aiAssistantEnabled: boolean;
  aiAssistantPromptTemplate: string | null;
  aiAssistantSkipNoisePattern: string;
  defaultPrompt: string;
  provider: string;
  model: string;
  maxDaily: number;
  enabled: boolean;
}

interface AiUsage {
  usedToday: number;
  maxDaily: number;
  remaining: number;
  enabled: boolean;
}

const loading = ref(true);
const saving = ref(false);
const config = ref<AiAssistantConfig | null>(null);
const usage = ref<AiUsage | null>(null);
const saveMessage = ref('');
const saveOk = ref(false);
const testPromptOpen = ref(false);

type ProviderItem = {
  id: string;
  name: string;
  baseUrl: string;
  hasKey: boolean;
  keyMask: string;
  isCustom?: boolean;
  model?: string;
  isActive?: boolean;
};
const providers = ref<ProviderItem[]>([]);
const providerDialogOpen = ref(false);
const editingProvider = ref<ProviderItem | null>(null);
const providerSaving = ref(false);
const providerError = ref('');
const providerForm = reactive({
  name: '',
  slug: '',
  apiType: 'chat_completions',
  baseUrl: '',
  model: '',
  apiKey: '',
  isActive: true,
});
const testingConnection = ref(false);
const testResult = ref<{ ok: boolean; message: string } | null>(null);

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
};
const knowledgeDocs = ref<KnowledgeDoc[]>([]);
const docDialogOpen = ref(false);
const editingDoc = ref<KnowledgeDoc | null>(null);
const docSaving = ref(false);
const docError = ref('');
const docForm = reactive({
  title: '',
  content: '',
  isActive: true,
});

async function loadKnowledgeDocs() {
  try {
    const res = await api.get<KnowledgeDoc[]>('/ai/knowledge');
    knowledgeDocs.value = res.data || [];
  } catch (e: any) {
    console.warn('Knowledge docs load failed:', e);
  }
}

function openDocDialog(doc?: KnowledgeDoc) {
  editingDoc.value = doc || null;
  docError.value = '';
  if (doc) {
    docForm.title = doc.title;
    docForm.content = doc.content;
    docForm.isActive = doc.isActive;
  } else {
    docForm.title = '';
    docForm.content = '';
    docForm.isActive = true;
  }
  docDialogOpen.value = true;
}

async function saveDoc() {
  if (!docForm.title.trim() || !docForm.content.trim()) {
    docError.value = 'Tiêu đề và nội dung là bắt buộc';
    return;
  }
  docSaving.value = true;
  docError.value = '';
  try {
    if (editingDoc.value) {
      await api.put(`/ai/knowledge/${editingDoc.value.id}`, docForm);
    } else {
      await api.post('/ai/knowledge', docForm);
    }
    docDialogOpen.value = false;
    await loadKnowledgeDocs();
  } catch (e: any) {
    docError.value = e?.response?.data?.error || e?.message || 'Lỗi khi lưu tài liệu';
  } finally {
    docSaving.value = false;
  }
}

async function removeDoc(doc: KnowledgeDoc) {
  if (!confirm(`Xóa tài liệu "${doc.title}"?`)) return;
  try {
    await api.delete(`/ai/knowledge/${doc.id}`);
    await loadKnowledgeDocs();
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Không thể xóa tài liệu');
  }
}

async function loadProviders() {
  try {
    const res = await api.get<ProviderItem[]>('/ai/providers');
    providers.value = res.data || [];
  } catch (e: any) {
    console.error('Failed to load AI providers', e);
  }
}

function openProviderForm(p?: ProviderItem) {
  editingProvider.value = p || null;
  providerError.value = '';
  testResult.value = null;
  if (p) {
    providerForm.name = p.name;
    providerForm.slug = p.id;
    providerForm.apiType = 'chat_completions';
    providerForm.baseUrl = p.baseUrl;
    providerForm.model = p.model || '';
    providerForm.apiKey = '';
    providerForm.isActive = p.isActive !== false;
  } else {
    providerForm.name = '';
    providerForm.slug = '';
    providerForm.apiType = 'chat_completions';
    providerForm.baseUrl = 'https://api.openai.com/v1';
    providerForm.model = '';
    providerForm.apiKey = '';
    providerForm.isActive = true;
  }
  providerDialogOpen.value = true;
}

async function testProviderConnection() {
  testResult.value = null;
  providerError.value = '';
  if (!providerForm.baseUrl.trim() || !providerForm.apiKey.trim()) {
    providerError.value = 'Vui lòng nhập Base URL và API key để kiểm tra';
    return;
  }
  testingConnection.value = true;
  try {
    const res = await api.post<{ ok: boolean; message: string }>('/ai/providers/test', {
      baseUrl: providerForm.baseUrl,
      apiKey: providerForm.apiKey,
      model: providerForm.model || undefined,
    });
    testResult.value = { ok: true, message: res.data.message || 'Kết nối thành công!' };
  } catch (e: any) {
    testResult.value = {
      ok: false,
      message: e?.response?.data?.error || e?.message || 'Kết nối thất bại',
    };
  } finally {
    testingConnection.value = false;
  }
}

async function saveProvider() {
  if (!providerForm.name.trim() || !providerForm.slug.trim()) {
    providerError.value = 'Vui lòng nhập Tên và Tiền tố';
    return;
  }
  providerError.value = '';
  providerSaving.value = true;
  try {
    if (editingProvider.value) {
      await api.put(`/ai/providers/${editingProvider.value.id}`, {
        name: providerForm.name,
        baseUrl: providerForm.baseUrl,
        model: providerForm.model || 'default',
        apiKey: providerForm.apiKey || undefined,
        isActive: providerForm.isActive,
      });
    } else {
      await api.post('/ai/providers', {
        name: providerForm.name,
        slug: providerForm.slug,
        baseUrl: providerForm.baseUrl,
        model: providerForm.model || 'default',
        apiKey: providerForm.apiKey,
      });
    }
    providerDialogOpen.value = false;
    await loadProviders();
  } catch (e: any) {
    providerError.value = e?.response?.data?.error || e?.message || 'Lỗi khi lưu provider';
  } finally {
    providerSaving.value = false;
  }
}

async function removeProvider(p: ProviderItem) {
  if (!confirm(`Xóa provider "${p.name}"?`)) return;
  try {
    await api.delete(`/ai/providers/${p.id}`);
    await loadProviders();
  } catch (e: any) {
    alert(e?.response?.data?.error || e?.message || 'Không thể xóa provider');
  }
}

async function saveAiProvider() {
  if (!config.value) return;
  try {
    await api.put('/ai/config', { provider: config.value.provider, model: config.value.model });
    saveMessage.value = '✓ Đã cập nhật provider AI';
    saveOk.value = true;
  } catch (e: any) {
    saveMessage.value = e?.response?.data?.error || e?.message || 'Lỗi cập nhật provider AI';
    saveOk.value = false;
  }
}

const lowQuota = computed(() => {
  if (!usage.value || !config.value) return false;
  return usage.value.remaining < config.value.maxDaily * 0.2;
});

async function load() {
  loading.value = true;
  try {
    const [cfgRes, usageRes] = await Promise.all([
      api.get<AiAssistantConfig>('/ai/assistant-config'),
      api.get<AiUsage>('/ai/usage'),
    ]);
    config.value = cfgRes.data;
    usage.value = usageRes.data;
    await loadProviders();
    await loadKnowledgeDocs();
  } catch (e: any) {
    saveMessage.value = e?.response?.data?.error || e?.message || 'Lỗi tải cài đặt';
    saveOk.value = false;
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!config.value || saving.value) return;
  saving.value = true;
  saveMessage.value = '';
  try {
    // Validate regex client-side
    try {
      new RegExp(config.value.aiAssistantSkipNoisePattern);
    } catch {
      saveMessage.value = 'Regex không hợp lệ';
      saveOk.value = false;
      saving.value = false;
      return;
    }
    await api.put('/ai/assistant-config', {
      aiAssistantEnabled: config.value.aiAssistantEnabled,
      aiAssistantPromptTemplate: config.value.aiAssistantPromptTemplate,
      aiAssistantSkipNoisePattern: config.value.aiAssistantSkipNoisePattern,
    });
    saveMessage.value = '✓ Đã lưu cài đặt';
    saveOk.value = true;
    setTimeout(() => (saveMessage.value = ''), 3000);
  } catch (e: any) {
    saveMessage.value = e?.response?.data?.error || e?.message || 'Lỗi lưu cài đặt';
    saveOk.value = false;
  } finally {
    saving.value = false;
  }
}

function restoreDefault() {
  if (!config.value) return;
  if (!confirm('Khôi phục prompt mặc định? Prompt đã edit sẽ bị thay thế.')) return;
  config.value.aiAssistantPromptTemplate = config.value.defaultPrompt;
}

onMounted(load);
</script>

<style scoped>
.ai-page {
  max-width: 960px;
  padding: 20px;
}
.ai-page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}
.ai-page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 6px;
}
.ai-page-sub {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}
.loading-pill {
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
}
.ai-page-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toggle-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
}
.toggle-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  cursor: pointer;
}
.toggle-row input { margin-top: 2px; }
.toggle-label { font-weight: 600; font-size: 13px; }
.toggle-hint { font-size: 11px; color: #64748b; margin-top: 2px; }
.info-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
}
.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
}
.info-label { color: #64748b; }
.info-value { font-weight: 500; }
.info-value.low-quota { color: #b91c1c; }

.field-group {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
}
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #1f2937;
}
.field-meta {
  color: #64748b;
  font-weight: 400;
  font-size: 11px;
}
.field-hint {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}
.prompt-editor {
  width: 100%;
  min-height: 380px;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #fafbfc;
  color: #1e3a8a;
  resize: vertical;
}
.regex-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 16px 0;
  border-top: 1px solid #e2e8f0;
}
.btn-primary {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #64748b;
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}
.btn-danger-ghost {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  background: #fff;
  color: #b91c1c;
  font-weight: 500;
  cursor: pointer;
  font-size: 13px;
}
.save-msg {
  text-align: right;
  font-size: 12px;
  padding: 6px;
}
.save-msg.ok { color: #166534; }
.save-msg.err { color: #b91c1c; }

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.provider-table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.provider-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.provider-table th,
.provider-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}
.provider-table th {
  background: #f8fafc;
  font-weight: 600;
}
.url-cell {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #475569;
}
.provider-actions {
  display: flex;
  gap: 8px;
}
.provider-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.provider-form label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
}
.modal-traffic-lights {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-right: 8px;
}
.modal-traffic-lights .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.modal-traffic-lights .dot.red { background: #ef4444; }
.modal-traffic-lights .dot.yellow { background: #f59e0b; }
.modal-traffic-lights .dot.green { background: #10b981; }
.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}
.form-desc {
  font-size: 12px;
  color: #64748b;
}
.form-select {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  background: #fff;
}
.api-key-row {
  display: flex;
  gap: 8px;
}
.api-key-row input {
  flex: 1;
}
.btn-check {
  padding: 8px 14px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.btn-check:hover:not(:disabled) {
  background: #e2e8f0;
}
.test-feedback {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}
.test-feedback.ok {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.test-feedback.err {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.btn-cancel {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-weight: 500;
}
.main-action {
  background: #7c3aed !important;
}
.provider-form input[type="text"],
.provider-form input[type="password"],
.provider-form input:not([type="checkbox"]) {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
}
.provider-form .toggle-row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.actions.compact {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.btn-link {
  background: none;
  border: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
}
.btn-link.danger {
  color: #dc2626;
}

.provider-selection {
  display: flex;
  gap: 8px;
  align-items: center;
}
.provider-selection select,
.model-input {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
}
.compact-button {
  padding: 4px 10px !important;
  font-size: 12px !important;
}
.doc-textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-body {
  background: #fff;
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: auto;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}
.modal-header h3 { margin: 0; font-size: 14px; font-weight: 600; }
.modal-close {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #64748b;
}
.modal-content { padding: 16px; }
.modal-hint { font-size: 13px; color: #64748b; line-height: 1.6; }
</style>
