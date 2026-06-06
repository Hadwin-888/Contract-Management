<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, MoreHorizontal, Calendar, Users, Clock } from 'lucide-vue-next'
import PageTransition from '@/components/common/PageTransition.vue'
import { fetchProjects, createProject, deleteProject } from '@/api/projects'
import type { Project } from '@/api/projects'

const { t } = useI18n()
const router = useRouter()

const projects = ref<Project[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const form = ref({ name: '', description: '', startDate: '', endDate: '' })

onMounted(() => { loadProjects() })

async function loadProjects() {
  loading.value = true
  try {
    const result = await fetchProjects({ pageSize: 50 })
    projects.value = result.items
  } catch (error) {
    console.error('Failed to load projects:', error)
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  form.value = { name: '', description: '', startDate: '', endDate: '' }
  dialogVisible.value = true
}

async function handleCreate() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  try {
    await createProject(form.value)
    ElMessage.success('项目已创建')
    dialogVisible.value = false
    await loadProjects()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '创建失败')
  }
}

async function handleDelete(project: Project) {
  try {
    await ElMessageBox.confirm(`确定删除项目"${project.name}"？`, '确认', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
    })
    await deleteProject(project.id)
    ElMessage.success('已删除')
    await loadProjects()
  } catch { /* cancelled */ }
}

function goToProject(id: string) {
  router.push(`/projects/${id}`)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { active: '进行中', archived: '已归档', completed: '已完成' }
  return map[status] || status
}
</script>

<template>
  <PageTransition>
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ t('project.title') }}</h1>
        </div>
        <el-button type="primary" size="large" @click="openCreateDialog">
          <Plus :size="18" />
          {{ t('project.createProject') }}
        </el-button>
      </div>

      <div class="project-grid" v-loading="loading">
        <div v-for="project in projects" :key="project.id" class="project-card" @click="goToProject(project.id)">
          <div class="card-header">
            <h3 class="card-title">{{ project.name }}</h3>
            <el-dropdown trigger="click" @click.stop>
              <button class="card-more"><MoreHorizontal :size="16" /></button>
              <template #dropdown>
                <el-dropdown-item @click.stop="handleDelete(project)">删除</el-dropdown-item>
              </template>
            </el-dropdown>
          </div>
          <p class="card-desc">{{ project.description || t('common.noData') }}</p>
          <div class="card-meta">
            <span><Users :size="14" /> {{ project._count?.members || 0 }}</span>
            <span><Calendar :size="14" /> {{ formatDate(project.startDate) }}</span>
          </div>
          <div class="card-footer">
            <el-tag size="small" :type="project.status === 'active' ? 'success' : 'info'">
              {{ statusLabel(project.status) }}
            </el-tag>
            <span class="task-count">{{ project._count?.tasks || 0 }} 任务</span>
          </div>
        </div>
        <el-empty v-if="!loading && projects.length === 0" :description="t('common.noData')" />
      </div>

      <el-dialog v-model="dialogVisible" :title="t('project.createProject')" width="500px">
        <el-form :model="form" label-position="top">
          <el-form-item :label="t('project.projectName')" required>
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item :label="t('project.projectDesc')">
            <el-input v-model="form.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item :label="t('project.startDate')">
            <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
          <el-form-item :label="t('project.endDate')">
            <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="handleCreate">{{ t('common.create') }}</el-button>
        </template>
      </el-dialog>
    </div>
  </PageTransition>
</template>

<style scoped>
.page { padding: 0; }
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}
.page-title { font-size: 24px; font-weight: 700; margin: 0; }
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.project-card {
  padding: 20px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.project-card:hover { border-color: var(--apple-blue, #007aff); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.card-title { font-size: 16px; font-weight: 600; margin: 0; }
.card-more { background: none; border: none; cursor: pointer; color: var(--text-secondary); padding: 4px; border-radius: 4px; }
.card-more:hover { background: var(--hover-bg); }
.card-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-meta { display: flex; gap: 16px; font-size: 12px; color: var(--text-tertiary); margin-bottom: 12px; }
.card-meta span { display: flex; align-items: center; gap: 4px; }
.card-footer { display: flex; align-items: center; justify-content: space-between; }
.task-count { font-size: 12px; color: var(--text-tertiary); }
</style>
