import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

const HOTEL_REVIEW_FORMAT = `
---

**合同名称**：【乙方名称】XXX合同
**合同金额**：人民币 XX,XXX 元（含税/不含税）
**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】
**审核日期**：YYYY年MM月DD日

---

## 逐条检查结果

## 问题清单（按严重度排序）

### 🔴 严重问题（必须修改）

**问题1：【简述，一句话】**
- 所在条款：第X条第Y款
- 原文引用：「原文内容」
- 风险分析：具体说明可能导致什么后果
- 修改建议：建议改为「修改后文本」

### 🟡 中等问题（建议修改）

### 🟢 轻微问题

---

## 亮点条款

---

## 补充建议

---

## 金额验算

| 项目 | 金额 | 验算 |
|------|------|------|
| 合同总价（含税） | ¥XX,XXX | -- |
| 不含税金额 | ¥XX,XXX | ÷(1+税率) |
| 税额 | ¥XXX | ×税率 |
| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |
`.trim();

const templates = [
  ['采购', '采购合同审核规则', ['供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。']],
  ['服务', '服务合同审核规则', ['服务范围、人员资质、服务标准、验收口径、付款节点、发票税率、数据安全、违约及赔偿。']],
  ['服务外包', '服务外包合同审核规则', ['外包边界、驻场/非驻场管理、人员替换、工伤与用工风险、服务质量、考核扣款、保密合规。']],
  ['租赁', '租赁合同审核规则', ['租赁标的权属、租金押金、税费承担、维修责任、提前解约、到期交还。']],
  ['工程', '工程合同审核规则', ['工程范围、图纸清单、工期、签证变更、验收结算、质保金、安全责任、保险。']],
  ['技术', '技术合同审核规则', ['技术交付物、里程碑、验收测试、源代码/账号、知识产权、数据安全、运维质保。']],
  ['人力资源', '人力资源合同审核规则', ['用工性质、人员资质、社保个税、工伤责任、个人信息、竞业保密、终止交接。']],
  ['营销', '营销合同审核规则', ['营销目标、投放渠道、KPI、素材权利、广告合规、肖像/商标授权、费用结算。']],
  ['广告文案', '广告文案审核规则', ['绝对化用语、虚假宣传、价格表述、品牌调性、错别字、敏感词、知识产权。']],
] as const;

function templateContent(type: string, points: readonly string[]) {
  return `
# ${type}合同/文件审核规则 - 深圳美高梅酒店专用版

## 审核立场
- 始终以有利于“深圳美高梅酒店”的方向审核。
- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。
- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。
- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。

## 本类型重点
${points.map((p) => `- ${p}`).join('\n')}

## 输出格式
AI 审核报告必须严格使用以下格式：

${HOTEL_REVIEW_FORMAT}
`.trim();
}

export async function seedDatabase() {
  const passwordHash = bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { role: 'super_admin', isActive: true },
    create: {
      username: 'admin',
      passwordHash,
      name: '管理员',
      email: 'admin@example.com',
      department: '管理部',
      departmentCode: 'MGMT',
      role: 'super_admin',
    },
  });

  await prisma.$transaction([
    prisma.storageConfig.upsert({ where: { key: 'contractPath' }, update: {}, create: { key: 'contractPath', value: 'contract' } }),
    prisma.storageConfig.upsert({ where: { key: 'insurancePath' }, update: {}, create: { key: 'insurancePath', value: 'insurance' } }),
    prisma.storageConfig.upsert({ where: { key: 'namingRule' }, update: {}, create: { key: 'namingRule', value: '{contractNo}{name}{partyB}' } }),
    prisma.aiConfig.upsert({ where: { key: 'model' }, update: {}, create: { key: 'model', value: 'deepseek', updatedBy: admin.id } }),
  ]);

  for (const [contractType, name, points] of templates) {
    await prisma.auditTemplate.upsert({
      where: { contractType },
      update: {},
      create: {
        contractType,
        name,
        content: templateContent(contractType, points),
        summaryContent: `请提炼${contractType}文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。`,
        updatedBy: admin.id,
      },
    });
  }
}

seedDatabase()
  .catch((error) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

