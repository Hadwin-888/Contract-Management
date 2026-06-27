--
-- PostgreSQL database dump
--

\restrict 4h2zWfDLEsqt0gBIgyUQeByfElA0j6eB5FDtq8uiVlweehXrzF8tj9NaKotfqJb

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Name: ai_config; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.ai_config (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    updated_by text
);


ALTER TABLE public.ai_config OWNER TO admin;

--
-- Name: approval_flow_steps; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.approval_flow_steps (
    id text NOT NULL,
    flow_id text NOT NULL,
    step_order integer NOT NULL,
    role_name text NOT NULL,
    "actionType" text DEFAULT 'approve'::text NOT NULL,
    required boolean DEFAULT true NOT NULL
);


ALTER TABLE public.approval_flow_steps OWNER TO admin;

--
-- Name: approval_flows; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.approval_flows (
    id text NOT NULL,
    name text NOT NULL,
    module text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.approval_flows OWNER TO admin;

--
-- Name: approval_records; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.approval_records (
    id text NOT NULL,
    flow_id text,
    step_id text,
    request_id text NOT NULL,
    request_type text NOT NULL,
    approver_id text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    comment text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    audit_record_id text,
    audit_snapshot text,
    submit_note text,
    risk_score integer,
    critical_issue_count integer
);


ALTER TABLE public.approval_records OWNER TO admin;

--
-- Name: audit_records; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_records (
    id text NOT NULL,
    contract_id text NOT NULL,
    risk_score integer DEFAULT 0 NOT NULL,
    issues_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    analysis text,
    suggestions text,
    summary text DEFAULT ''::text NOT NULL,
    template_id text,
    template_version integer,
    template_content_snapshot text,
    contract_type text,
    extracted_fields text DEFAULT '{}'::text NOT NULL,
    rule_issues text DEFAULT '[]'::text NOT NULL,
    ai_issues text DEFAULT '[]'::text NOT NULL,
    reviewed_issues text DEFAULT '[]'::text NOT NULL,
    need_human_review_count integer DEFAULT 0 NOT NULL,
    audit_version text DEFAULT 'structured-v1'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_by text
);


ALTER TABLE public.audit_records OWNER TO admin;

--
-- Name: audit_templates; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_templates (
    id text NOT NULL,
    contract_type text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    summary_content text DEFAULT ''::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    updated_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.audit_templates OWNER TO admin;

--
-- Name: contracts; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.contracts (
    id text NOT NULL,
    name text NOT NULL,
    party_a text NOT NULL,
    party_b text NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    amount double precision DEFAULT 0 NOT NULL,
    amount_excluding_tax double precision,
    tax_rate double precision,
    quality_deposit text,
    contract_no text,
    start_date text NOT NULL,
    end_date text NOT NULL,
    contract_term text,
    risk_level text DEFAULT 'low'::text NOT NULL,
    insurance_info text,
    insurance_date text,
    file_path text,
    insurance_file_path text,
    is_audit_draft boolean DEFAULT false NOT NULL,
    follow_dept text,
    cost_dept text,
    cost_code text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id text,
    sealed_file_path text,
    archive_status text DEFAULT 'not_started'::text NOT NULL,
    sealed_uploaded_by text,
    sealed_uploaded_at timestamp(3) without time zone,
    sealed_verification_status text,
    sealed_verification_report text,
    approval_submitted_at timestamp(3) without time zone,
    approval_approved_at timestamp(3) without time zone
);


ALTER TABLE public.contracts OWNER TO admin;

--
-- Name: custom_roles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.custom_roles (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.custom_roles OWNER TO admin;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.departments (
    id text NOT NULL,
    code text NOT NULL,
    short_name text NOT NULL,
    name text NOT NULL,
    head_name text DEFAULT ''::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.departments OWNER TO admin;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notification_preferences (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    email_enabled boolean DEFAULT true NOT NULL,
    in_app_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO admin;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    content text,
    module text,
    ref_id text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO admin;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    module text NOT NULL,
    action text NOT NULL,
    description text
);


ALTER TABLE public.permissions OWNER TO admin;

--
-- Name: procurement_requests; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.procurement_requests (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    amount double precision DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit text,
    requester_id text NOT NULL,
    department text,
    status text DEFAULT 'draft'::text NOT NULL,
    urgency text DEFAULT 'normal'::text NOT NULL,
    reason text,
    supplier_id text,
    purchase_order_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.procurement_requests OWNER TO admin;

--
-- Name: progress_updates; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.progress_updates (
    id text NOT NULL,
    task_id text NOT NULL,
    user_id text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.progress_updates OWNER TO admin;

--
-- Name: project_files; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.project_files (
    id text NOT NULL,
    project_id text NOT NULL,
    filename text NOT NULL,
    original_name text NOT NULL,
    size integer NOT NULL,
    mime_type text NOT NULL,
    file_type text DEFAULT 'support'::text NOT NULL,
    uploaded_by text,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_files OWNER TO admin;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.project_members (
    id text NOT NULL,
    project_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'member'::text NOT NULL
);


ALTER TABLE public.project_members OWNER TO admin;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.projects (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    start_date timestamp(3) without time zone,
    end_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    department text,
    priority text DEFAULT 'medium'::text NOT NULL,
    type text,
    progress integer DEFAULT 0 NOT NULL,
    owner_id text,
    target_name text,
    target_date timestamp(3) without time zone,
    countdown_mode boolean DEFAULT false NOT NULL,
    countdown_label text,
    completion_note text,
    completion_submitted_at timestamp(3) without time zone,
    completion_approved_at timestamp(3) without time zone
);


ALTER TABLE public.projects OWNER TO admin;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.purchase_orders (
    id text NOT NULL,
    order_no text NOT NULL,
    supplier_id text NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    ordered_date timestamp(3) without time zone,
    received_date timestamp(3) without time zone,
    remark text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.purchase_orders OWNER TO admin;

--
-- Name: reminders; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.reminders (
    id text NOT NULL,
    contract_id text NOT NULL,
    contract_name text NOT NULL,
    days_remaining integer NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reminders OWNER TO admin;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.role_permissions (
    id text NOT NULL,
    role_id text NOT NULL,
    permission_id text NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO admin;

--
-- Name: storage_config; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.storage_config (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.storage_config OWNER TO admin;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.suppliers (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    contact text,
    phone text,
    email text,
    address text,
    category text,
    status text DEFAULT 'active'::text NOT NULL,
    remark text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.suppliers OWNER TO admin;

--
-- Name: task_change_logs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.task_change_logs (
    id text NOT NULL,
    project_id text,
    task_id text,
    user_id text NOT NULL,
    action text NOT NULL,
    field_name text,
    "oldValue" text,
    "newValue" text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.task_change_logs OWNER TO admin;

--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.task_comments (
    id text NOT NULL,
    task_id text NOT NULL,
    user_id text NOT NULL,
    content text NOT NULL,
    mentions text DEFAULT '[]'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.task_comments OWNER TO admin;

--
-- Name: task_dependencies; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.task_dependencies (
    id text NOT NULL,
    task_id text NOT NULL,
    depends_on_task_id text NOT NULL
);


ALTER TABLE public.task_dependencies OWNER TO admin;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.tasks (
    id text NOT NULL,
    project_id text NOT NULL,
    parent_id text,
    title text NOT NULL,
    description text,
    status text DEFAULT 'todo'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    assignee_id text,
    start_date timestamp(3) without time zone,
    due_date timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    relative_to_target boolean DEFAULT false NOT NULL,
    start_offset_days integer,
    due_offset_days integer
);


ALTER TABLE public.tasks OWNER TO admin;

--
-- Name: uploads; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.uploads (
    id text NOT NULL,
    contract_id text,
    filename text NOT NULL,
    original_name text NOT NULL,
    size integer NOT NULL,
    mime_type text NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.uploads OWNER TO admin;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.user_roles (
    id text NOT NULL,
    user_id text NOT NULL,
    role_id text NOT NULL
);


ALTER TABLE public.user_roles OWNER TO admin;

--
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    email text,
    department text,
    department_code text,
    role text DEFAULT 'clerk'::text NOT NULL,
    avatar text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.users OWNER TO admin;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
da840f5e-850e-4781-a3ce-75ca116c697a	79cd87e3d19e304d4d62c537681213d7969947df4bef0c4b9789555129f3c16e	2026-06-06 17:16:32.760167+00	20260607000000_init	\N	\N	2026-06-06 17:16:32.702182+00	1
8fe618a0-adb8-42ca-9ea1-3e2f15cd7a0a	d81c2d0b9177e77fc4f15e204d1ec46992ed80c71be3e57c07ec0c61bce84cd5	2026-06-13 04:28:35.221665+00	20260613042835_add_contract_approval	\N	\N	2026-06-13 04:28:35.214834+00	1
d1b0a145-484c-42c4-8f43-476fa358f11e	f9391bb28537e9d2809018250de4c7037ea028f8a731002b04521b463de974d3	2026-06-26 17:07:55.044883+00	20260627011000_contract_audit_approval_archive	\N	\N	2026-06-26 17:07:55.035844+00	1
1a85d648-29ab-412a-b90f-f00aea013844	8d5b61072df214058437fa2c30979a3ef738844b0834697d1bc956913d55d34d	2026-06-26 17:21:00.20166+00	20260627012500_approval_polymorphic_request	\N	\N	2026-06-26 17:21:00.192154+00	1
12989b3d-17de-4070-b3fe-d4231daf5d20	5e915e8cdef0faefa116bca6d5cf372b4d57a2dc53da07e7eb34464f704b8c59	2026-06-26 18:20:12.628122+00	20260627023000_project_management_upgrade	\N	\N	2026-06-26 18:20:12.596298+00	1
\.


--
-- Data for Name: ai_config; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.ai_config (key, value, updated_at, updated_by) FROM stdin;
model	deepseek	2026-06-06 17:17:14.328	2d2dc4c4-6cf4-426c-9032-e055447815c8
\.


--
-- Data for Name: approval_flow_steps; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.approval_flow_steps (id, flow_id, step_order, role_name, "actionType", required) FROM stdin;
cf95e23e-d8f9-44b5-8c80-2fe4495d60bf	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	1	部门文员	confirm	t
68b7cd52-0112-4ac9-8d72-6ae6969bd42b	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	2	部门负责人	review	t
02152e1c-c62f-4860-b87d-ba179967fc41	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	3	财务文员	review	t
f4f8109d-15bc-4e05-b01e-a4c99d162732	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	4	财务总监	review	t
e0827f83-a70a-4798-9895-80d4dd31e401	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	5	总经理	review	t
c7216d0e-7e24-4a9f-bdd4-b8520c864a46	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	6	业主代表	approve	t
\.


--
-- Data for Name: approval_flows; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.approval_flows (id, name, module, description, is_active, created_at, updated_at) FROM stdin;
4fdfcee4-9c9a-4324-b978-062ecfa2dafe	合同审批	contract		t	2026-06-06 17:36:46.781	2026-06-06 17:36:46.781
\.


--
-- Data for Name: approval_records; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.approval_records (id, flow_id, step_id, request_id, request_type, approver_id, status, comment, created_at, audit_record_id, audit_snapshot, submit_note, risk_score, critical_issue_count) FROM stdin;
81ca86ff-7597-41ad-b816-7ee571de7477	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	f4f8109d-15bc-4e05-b01e-a4c99d162732	1633fc3b-01f5-4fe4-8904-877d09150a33	contract	9b768321-9f6d-41cf-a761-a1df265c4a06	approved	拟同意	2026-06-26 17:23:45.309	98699170-b696-45c1-8f77-6340cae7fd98	{"auditRecordId":"98699170-b696-45c1-8f77-6340cae7fd98","riskScore":56,"issuesCount":8,"status":"fail","criticalIssueCount":0,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【北京云起风扬商业发展有限公司】清洁剂采购合同\\n**合同金额**：人民币 未识别（需结合原文复核）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：北京云起风扬商业发展有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护充分，条款严谨，但存在合同金额未明确、付款条件模糊、附件细节待完善等中低风险问题，建议优化后签署。\\n共识别 8 个问题，其中严重问题 0 个、中等问题 4 个、轻微问题 4 个。\\n付款方式：7.1 本合同无预付款；结算周期：需结合原文复核；税率：13%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n暂无。\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题1：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题2：合同金额未明确，存在履约不确定性**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同金额：¥0.00万」\\n- 风险分析：框架协议未约定预估金额或最低采购量，可能导致乙方履约积极性不足或价格波动风险。\\n- 修改建议：建议改为「建议增加预估总金额或最低采购量条款，例如：「本合同预估总金额为人民币XX万元（含税），甲方不承诺最低采购量，但乙方应保证按合同单价供货。」」\\n\\n**问题3：付款条件中“结算完成并签署结算确认书”定义模糊**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全部货物运卸至交货地点……并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的100%。」\\n- 风险分析：“结算完成”未明确流程和时限，可能引发争议。\\n- 修改建议：建议改为「建议明确结算流程，例如：「甲方应在每批次货物验收合格后30日内完成结算并签署结算确认书，乙方应配合提供结算所需资料。」」\\n\\n**问题4：附件3《合同清单》中部分含税单价验算不一致**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「例如第1项未税单价126.55，含税单价143.00，验算126.55×1.13=143.00，一致；但第84项未税单价169.03，含税单价191，验算169.03×1.13=191.00，一致。经抽查，所有含税单价均正确。」\\n- 风险分析：虽验算一致，但合同清单中部分产品“最小单位”与“单位”不一致（如箱/瓶），可能导致下单时数量换算错误。\\n- 修改建议：建议改为「建议在清单中明确最小订货单位，或统一以最小单位计价。」\\n\\n### 🟢 轻微问题\\n\\n**问题5：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题6：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同编号：【 】」\\n- 风险分析：无编号不利于合同归档和后续管理。\\n- 修改建议：建议改为「建议补充唯一合同编号，如「MGM-SZ-CG-2026-001」。」\\n\\n**问题8：乙方统一社会信用代码缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「统一社会信用代码：」\\n- 风险分析：无法核实乙方主体资格，影响发票开具和税务合规。\\n- 修改建议：建议改为「要求乙方补充统一社会信用代码。」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 13%) |\\n| 税额 | 未识别 | ×税率 13% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"建议在合同中增加“最低库存量”或“紧急供货响应时间”条款，确保酒店运营不受影响。\\",\\"建议在附件2《分配器免费租赁协议》中明确分配器丢失或损坏的赔偿标准。\\",\\"建议将合同期限与酒店实际运营周期对齐，避免跨年合同导致预算管理不便。\\",\\"建议在合同清单中统一最小订货单位，避免下单时数量换算错误。\\",\\"建议要求乙方提供产品检测报告或第三方认证，确保符合酒店卫生标准。\\"]","summary":"好的，根据您提供的合同文件内容和信息，我已为您生成一份详细的文件概况。\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 深圳美高梅酒店客房清洁剂采购合同\\n*   **签订方：**\\n    *   甲方（采购方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应方）：北京云起风扬商业发展有限公司\\n*   **合同类型：** 货物采购（含配套设备免费租赁）\\n*   **合同金额：** 本合同为框架协议，未约定固定总金额。具体金额根据实际采购数量及附件3《合同清单》中的固定综合单价结算。合同清单中列明了53种清洁剂及相关耗材的含税单价，范围从约14.94元/瓶（晶杰强力清洁乳）到1517元/箱（无暇洗碗机用催干剂）不等。\\n*   **合同期限：** 供货期限自2026年07月01日起至2027年3月20日止。配套的《分配器免费租赁协议》期限与此一致。\\n\\n**2. 主要条款概述**\\n\\n*   **核心权利义务：**\\n    *   **甲方（酒店）：** 有权要求乙方按合同清单供应合格货物，并享受乙方提供的分配器免费租赁服务。主要义务是按时验收货物并按约定支付货款。\\n    *   **乙方（供应商）：** 负责在供货期内将货物运至甲方指定地点（深圳美高梅酒店），并承担运输、保险、包装、安装调试（如有）及质量保修责任。同时，乙方需免费提供并维护合同附件2所列的分配器设备。\\n*   **交付与验收：**\\n    *   货物交付地点为深圳美高梅酒店。乙方负责运输及交付前的所有风险和费用。\\n    *   货物到达后，双方共同开箱验收并签署验货记录。但甲方的签收不代表对货物质量的最终认可，甲方有权在使用过程中发现质量问题后提出异议。\\n    *   乙方在交付时需提供产品合格证、质量保证书、说明书等全套文件。\\n*   **付款方式：**\\n    *   **无预付款。**\\n    *   全部货物交付、安装调试（如有）完成、经甲方验收合格、双方完成结算并签署结算确认书后60日内，甲方向乙方支付至结算总价的100%。\\n    *   甲方付款的前提是乙方必须提前提交等额、合法、有效的增值税专用发票（税率13%）。\\n*   **质量保证：**\\n    *   质量保证期为一年，自货物验收合格之日起计算。\\n    *   质保期内，乙方提供免费维修、更换服务，并需在甲方通知后24小时内到现场处理。\\n    *   同一质量问题连续两次维修仍无法使用的，乙方必须更换同品牌、同型号货物。\\n*   **附件清单：**\\n    *   附件1：《廉洁合作协议》\\n    *   附件2：《分配器免费租赁协议》及《分配器免费使用表清单》（包含16种、共计约177件/套分配器及相关配件）\\n    *   附件3：《货物供应报价清单》（包含53种清洁剂及耗材的详细单价）\\n\\n**3. 关键风险提示**\\n\\n*   **金额不确定性风险：** 合同未约定总金额，为开口合同。实际采购成本完全取决于甲方的实际需求数量。甲方需做好采购预算管理，避免因需求激增导致成本失控。\\n*   **付款周期较长风险：** 付款条件为“全部货物交付验收、结算完成并签署结算确认书后60日内”。这意味着最后一笔货物交付后，还需经历结算流程和60天账期，乙方资金回笼压力较大。对于乙方而言，存在较长的","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额未明确，存在履约不确定性\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同金额：¥0.00万\\",\\"reason\\":\\"框架协议未约定预估金额或最低采购量，可能导致乙方履约积极性不足或价格波动风险。\\",\\"suggestion\\":\\"建议增加预估总金额或最低采购量条款，例如：「本合同预估总金额为人民币XX万元（含税），甲方不承诺最低采购量，但乙方应保证按合同单价供货。」\\",\\"confidence\\":0.9,\\"needHumanReview\\":false},{\\"title\\":\\"付款条件中“结算完成并签署结算确认书”定义模糊\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全部货物运卸至交货地点……并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的100%。\\",\\"reason\\":\\"“结算完成”未明确流程和时限，可能引发争议。\\",\\"suggestion\\":\\"建议明确结算流程，例如：「甲方应在每批次货物验收合格后30日内完成结算并签署结算确认书，乙方应配合提供结算所需资料。」\\",\\"confidence\\":0.85,\\"needHumanReview\\":false},{\\"title\\":\\"附件3《合同清单》中部分含税单价验算不一致\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"例如第1项未税单价126.55，含税单价143.00，验算126.55×1.13=143.00，一致；但第84项未税单价169.03，含税单价191，验算169.03×1.13=191.00，一致。经抽查，所有含税单价均正确。\\",\\"reason\\":\\"虽验算一致，但合同清单中部分产品“最小单位”与“单位”不一致（如箱/瓶），可能导致下单时数量换算错误。\\",\\"suggestion\\":\\"建议在清单中明确最小订货单位，或统一以最小单位计价。\\",\\"confidence\\":0.8,\\"needHumanReview\\":false},{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同编号：【 】\\",\\"reason\\":\\"无编号不利于合同归档和后续管理。\\",\\"suggestion\\":\\"建议补充唯一合同编号，如「MGM-SZ-CG-2026-001」。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"乙方统一社会信用代码缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"统一社会信用代码：\\",\\"reason\\":\\"无法核实乙方主体资格，影响发票开具和税务合规。\\",\\"suggestion\\":\\"要求乙方补充统一社会信用代码。\\",\\"confidence\\":1,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:14:34.009Z"}	特殊情况	56	0
56b4b257-60ea-4f25-8a1e-d6ce0968af14	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	f4f8109d-15bc-4e05-b01e-a4c99d162732	1c138f6b-2778-48f2-b357-a00ca672bf79	contract	9b768321-9f6d-41cf-a761-a1df265c4a06	approved	\N	2026-06-26 17:39:47.121	c386eca3-b13d-4034-a110-182600004c23	{"auditRecordId":"c386eca3-b13d-4034-a110-182600004c23","riskScore":20,"issuesCount":12,"status":"fail","criticalIssueCount":2,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【三亚辰檬贸易有限公司】代销合同\\n**合同金额**：人民币 未识别（含税价格）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：三亚辰檬贸易有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护较为充分，但存在发票类型错误、销售激励费用合规风险、合同金额缺失、质保金和保险缺失等问题，需重点修改发票条款和激励费用安排。\\n共识别 12 个问题，其中严重问题 2 个、中等问题 4 个、轻微问题 6 个。\\n付款方式：以银行转账的方式向乙 方指定的账户一次性支付上期商品代销结算价款；结算周期：月结，即当月实际卖出的乙方供货商品，甲方于合同约定的期限内 进行相应款项的支付；税率：3%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：发票类型错误，应为增值税专用发票而非普通发票**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...」\\n- 风险分析：甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\n- 修改建议：建议改为「将「增值税普通发票」改为「增值税专用发票」。」\\n\\n**问题2：销售激励费用存在商业贿赂风险**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。」\\n- 风险分析：直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\n- 修改建议：建议改为「建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。」\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题3：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题4：合同金额缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页：合同金额：¥0.00万」\\n- 风险分析：代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\n- 修改建议：建议改为「建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。」\\n\\n**问题5：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及质保金。」\\n- 风险分析：无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\n- 修改建议：建议改为「建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。」\\n\\n**问题6：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及保险。」\\n- 风险分析：商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\n- 修改建议：建议改为「建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。」\\n\\n### 🟢 轻微问题\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题8：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n**问题9：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到保险要求\\n- 修改建议：建议改为「如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期」\\n\\n**问题10：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页无编号。」\\n- 风险分析：不利于合同归档和追溯。\\n- 修改建议：建议改为「建议补充唯一合同编号。」\\n\\n**问题11：第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。」\\n- 风险分析：前后条款冲突，可能导致结算争议。\\n- 修改建议：建议改为「统一为增值税专用发票，删除第1项中的“普通”二字。」\\n\\n**问题12：退换货条款中“30个工作日”过长**\\n- 所在条款：第十条\\n- 原文引用：「第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走」\\n- 风险分析：30个工作日过长，可能导致商品积压。\\n- 修改建议：建议改为「建议缩短为10个工作日。」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 3%) |\\n| 税额 | 未识别 | ×税率 3% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"将发票类型统一为增值税专用发票，并删除普通发票的表述。\\",\\"删除或修改销售激励费用条款，改为商业折扣形式。\\",\\"增加预估合同金额或明确违约金计算基数。\\",\\"增加质保金和保险条款。\\",\\"缩短退换货提货期限至10个工作日。\\"]","summary":"好的，根据您提供的合同文件内容，现为您生成以下文件概况：\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 代销合同\\n*   **签订方：**\\n    *   甲方（采购方/代销方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应商）：三亚辰檬贸易有限公司\\n*   **合同类型：** 采购（代销）\\n*   **合同金额：** ¥0.00万元（合同未约定固定总金额，为按实际销售数量结算的代销模式）\\n*   **合同期限：** 自2026年6月5日至2028年6月4日，为期两年。合同到期前两个月可协商续签。\\n\\n**2. 主要条款概述**\\n\\n*   **核心合作模式：** 代销。商品所有权和风险在销售给第三方前归乙方所有，甲方不承担商品毁损、灭失的责任。甲方仅根据实际销售数量与乙方结算。\\n*   **代销商品范围：** 泳装、泳具、水上用品，品牌包括范德安、洲克、速比涛等。\\n*   **交付与验收：** 乙方根据甲方订单送货至指定地点，运费及保险费由乙方承担。甲方进行初步验收（数量、外观、包装等），但该验收不免除乙方的产品质量责任。\\n*   **价格与结算：**\\n    *   **结算单价：** 双方协商确定的固定含税单价（增值税税率3%）。\\n    *   **零售价：** 甲方有权自行决定对外售价。\\n    *   **结算方式：** 月结。甲方每月5日前提供销售明细表，双方核对无误后，乙方开具等额增值税普通发票，甲方在收到发票后45个工作日内支付上月代销货款。\\n    *   **销售激励：** 乙方需按当期实际含税结算总额的2%向甲方指定的酒店销售人员支付业务报酬，该费用由甲方从应付货款中直接扣除。\\n*   **退换货：** 甲方有权对不适销、包装损坏、存在质量问题或临期（保质期剩余不足90天）的商品进行退换货，相关费用由乙方承担。合同期满后，未售完的库存商品全部退还给乙方。\\n*   **违约责任：** 合同对乙方延期交货、商品质量不合格、违反承诺等行为设置了严格的违约金条款（如每日1%的延迟违约金，单次15%的违约金等），并明确甲方有权追偿包括律师费、诉讼费在内的全部损失。\\n*   **争议解决：** 协商不成时，可依法向甲方住所地（即深圳市盐田区）有管辖权的人民法院起诉。\\n\\n**3. 关键风险提示**\\n\\n*   **甲方单方优势地位风险：** 合同条款明显倾向于保护甲方利益。例如，甲方可单方决定零售价、对不适销商品进行退换货、以自身收银系统记录为唯一结算依据、在价格变动时适用对自身最有利的价格等。\\n*   **结算周期长且条件苛刻：** 从销售发生到乙方收到货款，需经历月度对账、开票、45个工作日账期，整体回款周期可能长达2-3个月，对乙方现金流压力较大。\\n*   **销售激励费用风险：** 乙方需额外支付2%的销售激励费用，且由甲方直接扣除，增加了乙方的实际成本。\\n*   **无限责任与高额违约金风险：** 合同约定乙方需对因商品问题导致的消费者索赔承担全部责任，且甲方的追偿范围包括间接损失及高达300%的利息。同时，多项违约情形设置了高达合同总金额15%-20%的违约金，","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到保险要求\\",\\"suggestion\\":\\"如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"发票类型错误，应为增值税专用发票而非普通发票\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...\\",\\"reason\\":\\"甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\",\\"suggestion\\":\\"将「增值税普通发票」改为「增值税专用发票」。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"销售激励费用存在商业贿赂风险\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。\\",\\"reason\\":\\"直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\",\\"suggestion\\":\\"建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页：合同金额：¥0.00万\\",\\"reason\\":\\"代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\",\\"suggestion\\":\\"建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及质保金。\\",\\"reason\\":\\"无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\",\\"suggestion\\":\\"建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及保险。\\",\\"reason\\":\\"商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\",\\"suggestion\\":\\"建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页无编号。\\",\\"reason\\":\\"不利于合同归档和追溯。\\",\\"suggestion\\":\\"建议补充唯一合同编号。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。\\",\\"reason\\":\\"前后条款冲突，可能导致结算争议。\\",\\"suggestion\\":\\"统一为增值税专用发票，删除第1项中的“普通”二字。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"退换货条款中“30个工作日”过长\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走\\",\\"reason\\":\\"30个工作日过长，可能导致商品积压。\\",\\"suggestion\\":\\"建议缩短为10个工作日。\\",\\"confidence\\":1,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:38:24.230Z"}	特殊原因	20	2
fba1e72f-5e7d-47ed-a2cc-ae7f8d552db9	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	f4f8109d-15bc-4e05-b01e-a4c99d162732	2cc7e43b-8c64-4bfe-a7bc-6b102b37f423	contract	9b768321-9f6d-41cf-a761-a1df265c4a06	approved	\N	2026-06-26 17:37:02.325	d5ee3392-5ad1-4a58-a857-aeeef59b8e43	{"auditRecordId":"d5ee3392-5ad1-4a58-a857-aeeef59b8e43","riskScore":25,"issuesCount":8,"status":"fail","criticalIssueCount":3,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【北京云起风扬商业发展有限公司】清洁剂采购合同\\n**合同金额**：人民币 未识别（需结合原文复核）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：北京云起风扬商业发展有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护充分，条款详细且偏向甲方。主要风险在于合同金额未明确、付款条件为100%后付无质保金、乙方统一社会信用代码缺失、分配器租赁协议中甲方责任条款需明确。建议补充金额、增加质保金、完善乙方信息并细化分配器责任。\\n共识别 8 个问题，其中严重问题 3 个、中等问题 3 个、轻微问题 2 个。\\n付款方式：7.1 本合同无预付款；结算周期：需结合原文复核；税率：13%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：合同金额未明确，存在结算风险**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同金额：¥0.00万」\\n- 风险分析：合同未约定总金额或预估金额，仅依赖附件3单价按实结算，可能导致预算失控或争议。\\n- 修改建议：建议改为「建议在合同首部增加预估总金额或最高限额，如“本合同预估总金额为人民币XX元（含税），最终按实际供货数量结算，但结算总价不得超过预估总金额的110%”。」\\n\\n**问题2：付款条件为100%后付，无质保金，甲方风险较高**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全部货物运卸至交货地点……并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的【100 】%。」\\n- 风险分析：无任何质保金或尾款，若质保期内出现质量问题，甲方缺乏有效制约手段。\\n- 修改建议：建议改为「建议修改为“支付至结算总价的95%，剩余5%作为质保金，质保期满后无质量问题30日内无息支付”。」\\n\\n**问题3：乙方统一社会信用代码缺失，主体资格存疑**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「统一社会信用代码：」\\n- 风险分析：无法核实乙方合法存续状态，影响合同效力及后续追责。\\n- 修改建议：建议改为「要求乙方补充完整统一社会信用代码，并通过国家企业信用信息公示系统核查。」\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题4：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题5：分配器租赁协议中甲方责任条款需明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「因甲方过失造成设备损坏或丢失的，应承担相应责任。」\\n- 风险分析：“相应责任”表述模糊，可能被乙方扩大解释，导致甲方承担不合理赔偿。\\n- 修改建议：建议改为「建议修改为“因甲方故意或重大过失造成设备损坏或丢失的，甲方应按设备重置成本赔偿，但正常损耗及非甲方原因导致的损坏除外”。」\\n\\n**问题6：合同文件解释顺序中未明确附件3《合同清单》的地位**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「(1）本合同及其附件。」\\n- 风险分析：附件3《合同清单》是价格核心，但未在解释顺序中特别强调，若与其他文件冲突可能产生争议。\\n- 修改建议：建议改为「建议在22.2.1条中明确“附件3《合同清单》中的单价为最终结算依据，优先于其他文件”。」\\n\\n### 🟢 轻微问题\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题8：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 13%) |\\n| 税额 | 未识别 | ×税率 13% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"补充合同预估总金额或最高限额，避免结算争议。\\",\\"增加5%质保金条款，确保质保期内乙方履约。\\",\\"要求乙方提供完整统一社会信用代码并核查。\\",\\"细化分配器租赁协议中甲方责任，限定为故意或重大过失。\\",\\"明确附件3《合同清单》在文件解释中的优先地位。\\"]","summary":"好的，根据您提供的合同文件内容和信息，我已为您生成一份详细的文件概况。\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 深圳美高梅酒店客房清洁剂采购合同\\n*   **签订方：**\\n    *   甲方（采购方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应方）：北京云起风扬商业发展有限公司\\n*   **合同类型：** 货物采购（含配套设备免费租赁）\\n*   **合同金额：** 本合同为框架协议，未约定固定总金额。具体金额根据实际采购数量及附件3《合同清单》中的固定综合单价结算。清单中列明了53种清洁剂及相关耗材的含税单价，例如“特洁牌R1 Plus浓缩马桶清洁剂”含税单价为143.00元/瓶。\\n*   **合同期限：** 供货期限自2026年07月01日起至2027年3月20日止。配套的《分配器免费租赁协议》期限与此一致。\\n\\n**2. 主要条款概述**\\n\\n*   **核心权利义务：**\\n    *   **甲方权利：** 有权要求乙方按合同清单供应合格货物；有权对货物进行验收、检测；在乙方违约时有权拒收、要求换货、解除合同并索赔；有权从应付货款中直接扣除违约金或赔偿金。\\n    *   **甲方义务：** 按合同约定支付货款；在货物到达后及时组织验收；妥善保管租赁的分配器。\\n    *   **乙方权利：** 有权在货物交付验收合格并完成结算后，按约定收取货款。\\n    *   **乙方义务：** 按合同清单供应全新、合格的货物；负责货物的包装、运输、保险及安装调试（如需）；承担货物交付前的所有风险；提供为期一年的质量保证及售后服务；免费提供分配器租赁并负责其维修保养。\\n*   **交付/服务内容：**\\n    *   **货物交付：** 乙方需在供货期限内将货物运至深圳美高梅酒店指定地点，并完成安装调试（如需）。甲方验收合格并签字确认后视为交付完成。\\n    *   **配套服务：** 乙方免费向甲方租赁一批清洁剂分配器（详见附件2清单），并负责在租赁期内的维修和替换服务，报修后4小时内安排工程师上门。\\n*   **付款方式：**\\n    *   **无预付款。**\\n    *   全部货物交付、安装调试完成、经甲方验收合格、双方完成结算并签署结算确认书后60日内，甲方向乙方支付至结算总价的100%。\\n    *   付款前提：乙方必须先向甲方提交等额合法有效的增值税专用发票（税率13%）。\\n\\n**3. 关键风险提示**\\n\\n*   **对甲方（酒店方）的风险：**\\n    *   **付款周期较长：** 付款条件为“结算完成并签署结算确认书后60日内”，流程耗时较长，可能影响供应商合作积极性。\\n    *   **合同金额不确定：** 合同为框架协议，无固定总价，实际采购成本取决于酒店用量，预算控制存在不确定性。\\n    *   **分配器保管责任：** 甲方需对免费租赁的分配器妥善保管，因自身过失造成损坏或丢失需承担责任。\\n*   **对乙方（供应方）的风险：**\\n    *   **付款条件严苛：** 需完成全部交付、验收、结算流程后才能申请付款，且甲方有权以发票问题为由延迟付款，资金占用周期长。\\n    *   **违约责任极重：** 合同设定了多项高额违约金条款（如逾期交货每日1%、单方解约10%-30%），且甲方有权直接从","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额未明确，存在结算风险\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同金额：¥0.00万\\",\\"reason\\":\\"合同未约定总金额或预估金额，仅依赖附件3单价按实结算，可能导致预算失控或争议。\\",\\"suggestion\\":\\"建议在合同首部增加预估总金额或最高限额，如“本合同预估总金额为人民币XX元（含税），最终按实际供货数量结算，但结算总价不得超过预估总金额的110%”。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"付款条件为100%后付，无质保金，甲方风险较高\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全部货物运卸至交货地点……并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的【100 】%。\\",\\"reason\\":\\"无任何质保金或尾款，若质保期内出现质量问题，甲方缺乏有效制约手段。\\",\\"suggestion\\":\\"建议修改为“支付至结算总价的95%，剩余5%作为质保金，质保期满后无质量问题30日内无息支付”。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"乙方统一社会信用代码缺失，主体资格存疑\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"统一社会信用代码：\\",\\"reason\\":\\"无法核实乙方合法存续状态，影响合同效力及后续追责。\\",\\"suggestion\\":\\"要求乙方补充完整统一社会信用代码，并通过国家企业信用信息公示系统核查。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"分配器租赁协议中甲方责任条款需明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"因甲方过失造成设备损坏或丢失的，应承担相应责任。\\",\\"reason\\":\\"“相应责任”表述模糊，可能被乙方扩大解释，导致甲方承担不合理赔偿。\\",\\"suggestion\\":\\"建议修改为“因甲方故意或重大过失造成设备损坏或丢失的，甲方应按设备重置成本赔偿，但正常损耗及非甲方原因导致的损坏除外”。\\",\\"confidence\\":0.9,\\"needHumanReview\\":false},{\\"title\\":\\"合同文件解释顺序中未明确附件3《合同清单》的地位\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"(1）本合同及其附件。\\",\\"reason\\":\\"附件3《合同清单》是价格核心，但未在解释顺序中特别强调，若与其他文件冲突可能产生争议。\\",\\"suggestion\\":\\"建议在22.2.1条中明确“附件3《合同清单》中的单价为最终结算依据，优先于其他文件”。\\",\\"confidence\\":0.8,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:26:54.817Z"}	特殊情况	25	3
56e607e2-1d5a-4b42-ab81-979517b545f6	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	f4f8109d-15bc-4e05-b01e-a4c99d162732	1c138f6b-2778-48f2-b357-a00ca672bf79	contract	9b768321-9f6d-41cf-a761-a1df265c4a06	approved	\N	2026-06-26 17:51:58.859	c386eca3-b13d-4034-a110-182600004c23	{"auditRecordId":"c386eca3-b13d-4034-a110-182600004c23","riskScore":20,"issuesCount":12,"status":"fail","criticalIssueCount":2,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【三亚辰檬贸易有限公司】代销合同\\n**合同金额**：人民币 未识别（含税价格）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：三亚辰檬贸易有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护较为充分，但存在发票类型错误、销售激励费用合规风险、合同金额缺失、质保金和保险缺失等问题，需重点修改发票条款和激励费用安排。\\n共识别 12 个问题，其中严重问题 2 个、中等问题 4 个、轻微问题 6 个。\\n付款方式：以银行转账的方式向乙 方指定的账户一次性支付上期商品代销结算价款；结算周期：月结，即当月实际卖出的乙方供货商品，甲方于合同约定的期限内 进行相应款项的支付；税率：3%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：发票类型错误，应为增值税专用发票而非普通发票**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...」\\n- 风险分析：甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\n- 修改建议：建议改为「将「增值税普通发票」改为「增值税专用发票」。」\\n\\n**问题2：销售激励费用存在商业贿赂风险**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。」\\n- 风险分析：直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\n- 修改建议：建议改为「建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。」\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题3：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题4：合同金额缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页：合同金额：¥0.00万」\\n- 风险分析：代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\n- 修改建议：建议改为「建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。」\\n\\n**问题5：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及质保金。」\\n- 风险分析：无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\n- 修改建议：建议改为「建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。」\\n\\n**问题6：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及保险。」\\n- 风险分析：商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\n- 修改建议：建议改为「建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。」\\n\\n### 🟢 轻微问题\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题8：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n**问题9：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到保险要求\\n- 修改建议：建议改为「如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期」\\n\\n**问题10：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页无编号。」\\n- 风险分析：不利于合同归档和追溯。\\n- 修改建议：建议改为「建议补充唯一合同编号。」\\n\\n**问题11：第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。」\\n- 风险分析：前后条款冲突，可能导致结算争议。\\n- 修改建议：建议改为「统一为增值税专用发票，删除第1项中的“普通”二字。」\\n\\n**问题12：退换货条款中“30个工作日”过长**\\n- 所在条款：第十条\\n- 原文引用：「第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走」\\n- 风险分析：30个工作日过长，可能导致商品积压。\\n- 修改建议：建议改为「建议缩短为10个工作日。」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 3%) |\\n| 税额 | 未识别 | ×税率 3% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"将发票类型统一为增值税专用发票，并删除普通发票的表述。\\",\\"删除或修改销售激励费用条款，改为商业折扣形式。\\",\\"增加预估合同金额或明确违约金计算基数。\\",\\"增加质保金和保险条款。\\",\\"缩短退换货提货期限至10个工作日。\\"]","summary":"好的，根据您提供的合同文件内容，现为您生成以下文件概况：\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 代销合同\\n*   **签订方：**\\n    *   甲方（采购方/代销方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应商）：三亚辰檬贸易有限公司\\n*   **合同类型：** 采购（代销）\\n*   **合同金额：** ¥0.00万元（合同未约定固定总金额，为按实际销售数量结算的代销模式）\\n*   **合同期限：** 自2026年6月5日至2028年6月4日，为期两年。合同到期前两个月可协商续签。\\n\\n**2. 主要条款概述**\\n\\n*   **核心合作模式：** 代销。商品所有权和风险在销售给第三方前归乙方所有，甲方不承担商品毁损、灭失的责任。甲方仅根据实际销售数量与乙方结算。\\n*   **代销商品范围：** 泳装、泳具、水上用品，品牌包括范德安、洲克、速比涛等。\\n*   **交付与验收：** 乙方根据甲方订单送货至指定地点，运费及保险费由乙方承担。甲方进行初步验收（数量、外观、包装等），但该验收不免除乙方的产品质量责任。\\n*   **价格与结算：**\\n    *   **结算单价：** 双方协商确定的固定含税单价（增值税税率3%）。\\n    *   **零售价：** 甲方有权自行决定对外售价。\\n    *   **结算方式：** 月结。甲方每月5日前提供销售明细表，双方核对无误后，乙方开具等额增值税普通发票，甲方在收到发票后45个工作日内支付上月代销货款。\\n    *   **销售激励：** 乙方需按当期实际含税结算总额的2%向甲方指定的酒店销售人员支付业务报酬，该费用由甲方从应付货款中直接扣除。\\n*   **退换货：** 甲方有权对不适销、包装损坏、存在质量问题或临期（保质期剩余不足90天）的商品进行退换货，相关费用由乙方承担。合同期满后，未售完的库存商品全部退还给乙方。\\n*   **违约责任：** 合同对乙方延期交货、商品质量不合格、违反承诺等行为设置了严格的违约金条款（如每日1%的延迟违约金，单次15%的违约金等），并明确甲方有权追偿包括律师费、诉讼费在内的全部损失。\\n*   **争议解决：** 协商不成时，可依法向甲方住所地（即深圳市盐田区）有管辖权的人民法院起诉。\\n\\n**3. 关键风险提示**\\n\\n*   **甲方单方优势地位风险：** 合同条款明显倾向于保护甲方利益。例如，甲方可单方决定零售价、对不适销商品进行退换货、以自身收银系统记录为唯一结算依据、在价格变动时适用对自身最有利的价格等。\\n*   **结算周期长且条件苛刻：** 从销售发生到乙方收到货款，需经历月度对账、开票、45个工作日账期，整体回款周期可能长达2-3个月，对乙方现金流压力较大。\\n*   **销售激励费用风险：** 乙方需额外支付2%的销售激励费用，且由甲方直接扣除，增加了乙方的实际成本。\\n*   **无限责任与高额违约金风险：** 合同约定乙方需对因商品问题导致的消费者索赔承担全部责任，且甲方的追偿范围包括间接损失及高达300%的利息。同时，多项违约情形设置了高达合同总金额15%-20%的违约金，","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到保险要求\\",\\"suggestion\\":\\"如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"发票类型错误，应为增值税专用发票而非普通发票\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...\\",\\"reason\\":\\"甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\",\\"suggestion\\":\\"将「增值税普通发票」改为「增值税专用发票」。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"销售激励费用存在商业贿赂风险\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。\\",\\"reason\\":\\"直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\",\\"suggestion\\":\\"建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页：合同金额：¥0.00万\\",\\"reason\\":\\"代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\",\\"suggestion\\":\\"建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及质保金。\\",\\"reason\\":\\"无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\",\\"suggestion\\":\\"建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及保险。\\",\\"reason\\":\\"商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\",\\"suggestion\\":\\"建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页无编号。\\",\\"reason\\":\\"不利于合同归档和追溯。\\",\\"suggestion\\":\\"建议补充唯一合同编号。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。\\",\\"reason\\":\\"前后条款冲突，可能导致结算争议。\\",\\"suggestion\\":\\"统一为增值税专用发票，删除第1项中的“普通”二字。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"退换货条款中“30个工作日”过长\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走\\",\\"reason\\":\\"30个工作日过长，可能导致商品积压。\\",\\"suggestion\\":\\"建议缩短为10个工作日。\\",\\"confidence\\":1,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:38:24.230Z"}	jl;akdsjf	20	2
15d4255a-dfb9-4a83-8ef2-14a03c86e7a6	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	e0827f83-a70a-4798-9895-80d4dd31e401	1c138f6b-2778-48f2-b357-a00ca672bf79	contract	7095ccb5-1a06-488e-a275-d26489367bc2	approved	\N	2026-06-26 17:51:58.875	c386eca3-b13d-4034-a110-182600004c23	{"auditRecordId":"c386eca3-b13d-4034-a110-182600004c23","riskScore":20,"issuesCount":12,"status":"fail","criticalIssueCount":2,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【三亚辰檬贸易有限公司】代销合同\\n**合同金额**：人民币 未识别（含税价格）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：三亚辰檬贸易有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护较为充分，但存在发票类型错误、销售激励费用合规风险、合同金额缺失、质保金和保险缺失等问题，需重点修改发票条款和激励费用安排。\\n共识别 12 个问题，其中严重问题 2 个、中等问题 4 个、轻微问题 6 个。\\n付款方式：以银行转账的方式向乙 方指定的账户一次性支付上期商品代销结算价款；结算周期：月结，即当月实际卖出的乙方供货商品，甲方于合同约定的期限内 进行相应款项的支付；税率：3%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：发票类型错误，应为增值税专用发票而非普通发票**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...」\\n- 风险分析：甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\n- 修改建议：建议改为「将「增值税普通发票」改为「增值税专用发票」。」\\n\\n**问题2：销售激励费用存在商业贿赂风险**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。」\\n- 风险分析：直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\n- 修改建议：建议改为「建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。」\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题3：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题4：合同金额缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页：合同金额：¥0.00万」\\n- 风险分析：代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\n- 修改建议：建议改为「建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。」\\n\\n**问题5：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及质保金。」\\n- 风险分析：无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\n- 修改建议：建议改为「建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。」\\n\\n**问题6：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及保险。」\\n- 风险分析：商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\n- 修改建议：建议改为「建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。」\\n\\n### 🟢 轻微问题\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题8：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n**问题9：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到保险要求\\n- 修改建议：建议改为「如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期」\\n\\n**问题10：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页无编号。」\\n- 风险分析：不利于合同归档和追溯。\\n- 修改建议：建议改为「建议补充唯一合同编号。」\\n\\n**问题11：第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。」\\n- 风险分析：前后条款冲突，可能导致结算争议。\\n- 修改建议：建议改为「统一为增值税专用发票，删除第1项中的“普通”二字。」\\n\\n**问题12：退换货条款中“30个工作日”过长**\\n- 所在条款：第十条\\n- 原文引用：「第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走」\\n- 风险分析：30个工作日过长，可能导致商品积压。\\n- 修改建议：建议改为「建议缩短为10个工作日。」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 3%) |\\n| 税额 | 未识别 | ×税率 3% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"将发票类型统一为增值税专用发票，并删除普通发票的表述。\\",\\"删除或修改销售激励费用条款，改为商业折扣形式。\\",\\"增加预估合同金额或明确违约金计算基数。\\",\\"增加质保金和保险条款。\\",\\"缩短退换货提货期限至10个工作日。\\"]","summary":"好的，根据您提供的合同文件内容，现为您生成以下文件概况：\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 代销合同\\n*   **签订方：**\\n    *   甲方（采购方/代销方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应商）：三亚辰檬贸易有限公司\\n*   **合同类型：** 采购（代销）\\n*   **合同金额：** ¥0.00万元（合同未约定固定总金额，为按实际销售数量结算的代销模式）\\n*   **合同期限：** 自2026年6月5日至2028年6月4日，为期两年。合同到期前两个月可协商续签。\\n\\n**2. 主要条款概述**\\n\\n*   **核心合作模式：** 代销。商品所有权和风险在销售给第三方前归乙方所有，甲方不承担商品毁损、灭失的责任。甲方仅根据实际销售数量与乙方结算。\\n*   **代销商品范围：** 泳装、泳具、水上用品，品牌包括范德安、洲克、速比涛等。\\n*   **交付与验收：** 乙方根据甲方订单送货至指定地点，运费及保险费由乙方承担。甲方进行初步验收（数量、外观、包装等），但该验收不免除乙方的产品质量责任。\\n*   **价格与结算：**\\n    *   **结算单价：** 双方协商确定的固定含税单价（增值税税率3%）。\\n    *   **零售价：** 甲方有权自行决定对外售价。\\n    *   **结算方式：** 月结。甲方每月5日前提供销售明细表，双方核对无误后，乙方开具等额增值税普通发票，甲方在收到发票后45个工作日内支付上月代销货款。\\n    *   **销售激励：** 乙方需按当期实际含税结算总额的2%向甲方指定的酒店销售人员支付业务报酬，该费用由甲方从应付货款中直接扣除。\\n*   **退换货：** 甲方有权对不适销、包装损坏、存在质量问题或临期（保质期剩余不足90天）的商品进行退换货，相关费用由乙方承担。合同期满后，未售完的库存商品全部退还给乙方。\\n*   **违约责任：** 合同对乙方延期交货、商品质量不合格、违反承诺等行为设置了严格的违约金条款（如每日1%的延迟违约金，单次15%的违约金等），并明确甲方有权追偿包括律师费、诉讼费在内的全部损失。\\n*   **争议解决：** 协商不成时，可依法向甲方住所地（即深圳市盐田区）有管辖权的人民法院起诉。\\n\\n**3. 关键风险提示**\\n\\n*   **甲方单方优势地位风险：** 合同条款明显倾向于保护甲方利益。例如，甲方可单方决定零售价、对不适销商品进行退换货、以自身收银系统记录为唯一结算依据、在价格变动时适用对自身最有利的价格等。\\n*   **结算周期长且条件苛刻：** 从销售发生到乙方收到货款，需经历月度对账、开票、45个工作日账期，整体回款周期可能长达2-3个月，对乙方现金流压力较大。\\n*   **销售激励费用风险：** 乙方需额外支付2%的销售激励费用，且由甲方直接扣除，增加了乙方的实际成本。\\n*   **无限责任与高额违约金风险：** 合同约定乙方需对因商品问题导致的消费者索赔承担全部责任，且甲方的追偿范围包括间接损失及高达300%的利息。同时，多项违约情形设置了高达合同总金额15%-20%的违约金，","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到保险要求\\",\\"suggestion\\":\\"如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"发票类型错误，应为增值税专用发票而非普通发票\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...\\",\\"reason\\":\\"甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\",\\"suggestion\\":\\"将「增值税普通发票」改为「增值税专用发票」。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"销售激励费用存在商业贿赂风险\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。\\",\\"reason\\":\\"直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\",\\"suggestion\\":\\"建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页：合同金额：¥0.00万\\",\\"reason\\":\\"代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\",\\"suggestion\\":\\"建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及质保金。\\",\\"reason\\":\\"无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\",\\"suggestion\\":\\"建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及保险。\\",\\"reason\\":\\"商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\",\\"suggestion\\":\\"建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页无编号。\\",\\"reason\\":\\"不利于合同归档和追溯。\\",\\"suggestion\\":\\"建议补充唯一合同编号。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。\\",\\"reason\\":\\"前后条款冲突，可能导致结算争议。\\",\\"suggestion\\":\\"统一为增值税专用发票，删除第1项中的“普通”二字。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"退换货条款中“30个工作日”过长\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走\\",\\"reason\\":\\"30个工作日过长，可能导致商品积压。\\",\\"suggestion\\":\\"建议缩短为10个工作日。\\",\\"confidence\\":1,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:38:24.230Z"}	jl;akdsjf	20	2
f4dc6241-b856-4a24-830a-2aa6475b1595	4fdfcee4-9c9a-4324-b978-062ecfa2dafe	c7216d0e-7e24-4a9f-bdd4-b8520c864a46	1c138f6b-2778-48f2-b357-a00ca672bf79	contract	600189e4-7476-4e86-bf57-dd1c4bdac059	approved	\N	2026-06-26 17:51:58.887	c386eca3-b13d-4034-a110-182600004c23	{"auditRecordId":"c386eca3-b13d-4034-a110-182600004c23","riskScore":20,"issuesCount":12,"status":"fail","criticalIssueCount":2,"templateId":"c590b464-db0e-404d-a8dd-c1ad0d2dd3b7","templateVersion":2,"templateContentSnapshot":"# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\\n\\n## 审核立场\\n- 始终以有利于“深圳美高梅酒店”的方向审核。\\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\\n\\n## 本类型重点\\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\\n\\n## 输出格式\\nAI 审核报告必须严格使用以下格式：\\n\\n---\\n\\n**合同名称**：【乙方名称】XXX合同\\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\\n**审核日期**：YYYY年MM月DD日\\n\\n---\\n\\n## 逐条检查结果\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：【简述，一句话】**\\n- 所在条款：第X条第Y款\\n- 原文引用：「原文内容」\\n- 风险分析：具体说明可能导致什么后果\\n- 修改建议：建议改为「修改后文本」\\n\\n### 🟡 中等问题（建议修改）\\n\\n### 🟢 轻微问题\\n\\n---\\n\\n## 亮点条款\\n\\n---\\n\\n## 补充建议\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | ¥XX,XXX | -- |\\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\\n| 税额 | ¥XXX | ×税率 |\\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |","analysis":"> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\\n\\n---\\n\\n**合同名称**：【三亚辰檬贸易有限公司】代销合同\\n**合同金额**：人民币 未识别（含税价格）\\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：三亚辰檬贸易有限公司\\n**审核日期**：2026年06月27日\\n\\n---\\n\\n## 逐条检查结果\\n\\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护较为充分，但存在发票类型错误、销售激励费用合规风险、合同金额缺失、质保金和保险缺失等问题，需重点修改发票条款和激励费用安排。\\n共识别 12 个问题，其中严重问题 2 个、中等问题 4 个、轻微问题 6 个。\\n付款方式：以银行转账的方式向乙 方指定的账户一次性支付上期商品代销结算价款；结算周期：月结，即当月实际卖出的乙方供货商品，甲方于合同约定的期限内 进行相应款项的支付；税率：3%。\\n\\n## 问题清单（按严重度排序）\\n\\n### 🔴 严重问题（必须修改）\\n\\n**问题1：发票类型错误，应为增值税专用发票而非普通发票**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...」\\n- 风险分析：甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\n- 修改建议：建议改为「将「增值税普通发票」改为「增值税专用发票」。」\\n\\n**问题2：销售激励费用存在商业贿赂风险**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。」\\n- 风险分析：直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\n- 修改建议：建议改为「建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。」\\n\\n### 🟡 中等问题（建议修改）\\n\\n**问题3：合同金额缺失或无效**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到有效合同金额\\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\\n\\n**问题4：合同金额缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页：合同金额：¥0.00万」\\n- 风险分析：代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\n- 修改建议：建议改为「建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。」\\n\\n**问题5：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及质保金。」\\n- 风险分析：无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\n- 修改建议：建议改为「建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。」\\n\\n**问题6：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「全文未提及保险。」\\n- 风险分析：商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\n- 修改建议：建议改为「建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。」\\n\\n### 🟢 轻微问题\\n\\n**问题7：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到合同编号\\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\\n\\n**问题8：质保金或质量保障安排不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到质保金或质量保障安排\\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\\n\\n**问题9：保险要求不明确**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「未提供原文依据，建议人工复核」\\n- 风险分析：未识别到保险要求\\n- 修改建议：建议改为「如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期」\\n\\n**问题10：合同编号缺失**\\n- 所在条款：未明确，需人工定位\\n- 原文引用：「合同首页无编号。」\\n- 风险分析：不利于合同归档和追溯。\\n- 修改建议：建议改为「建议补充唯一合同编号。」\\n\\n**问题11：第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾**\\n- 所在条款：第十一条\\n- 原文引用：「第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。」\\n- 风险分析：前后条款冲突，可能导致结算争议。\\n- 修改建议：建议改为「统一为增值税专用发票，删除第1项中的“普通”二字。」\\n\\n**问题12：退换货条款中“30个工作日”过长**\\n- 所在条款：第十条\\n- 原文引用：「第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走」\\n- 风险分析：30个工作日过长，可能导致商品积压。\\n- 修改建议：建议改为「建议缩短为10个工作日。」\\n\\n---\\n\\n## 亮点条款\\n\\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\\n\\n---\\n\\n## 补充建议\\n\\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\\n\\n---\\n\\n## 金额验算\\n\\n| 项目 | 金额 | 验算 |\\n|------|------|------|\\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\\n| 不含税金额 | 未识别 | ÷(1+税率 3%) |\\n| 税额 | 未识别 | ×税率 3% |\\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |","suggestions":"[\\"将发票类型统一为增值税专用发票，并删除普通发票的表述。\\",\\"删除或修改销售激励费用条款，改为商业折扣形式。\\",\\"增加预估合同金额或明确违约金计算基数。\\",\\"增加质保金和保险条款。\\",\\"缩短退换货提货期限至10个工作日。\\"]","summary":"好的，根据您提供的合同文件内容，现为您生成以下文件概况：\\n\\n---\\n\\n**合同文件概况**\\n\\n**1. 合同基本信息摘要**\\n\\n*   **合同名称：** 代销合同\\n*   **签订方：**\\n    *   甲方（采购方/代销方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\\n    *   乙方（供应商）：三亚辰檬贸易有限公司\\n*   **合同类型：** 采购（代销）\\n*   **合同金额：** ¥0.00万元（合同未约定固定总金额，为按实际销售数量结算的代销模式）\\n*   **合同期限：** 自2026年6月5日至2028年6月4日，为期两年。合同到期前两个月可协商续签。\\n\\n**2. 主要条款概述**\\n\\n*   **核心合作模式：** 代销。商品所有权和风险在销售给第三方前归乙方所有，甲方不承担商品毁损、灭失的责任。甲方仅根据实际销售数量与乙方结算。\\n*   **代销商品范围：** 泳装、泳具、水上用品，品牌包括范德安、洲克、速比涛等。\\n*   **交付与验收：** 乙方根据甲方订单送货至指定地点，运费及保险费由乙方承担。甲方进行初步验收（数量、外观、包装等），但该验收不免除乙方的产品质量责任。\\n*   **价格与结算：**\\n    *   **结算单价：** 双方协商确定的固定含税单价（增值税税率3%）。\\n    *   **零售价：** 甲方有权自行决定对外售价。\\n    *   **结算方式：** 月结。甲方每月5日前提供销售明细表，双方核对无误后，乙方开具等额增值税普通发票，甲方在收到发票后45个工作日内支付上月代销货款。\\n    *   **销售激励：** 乙方需按当期实际含税结算总额的2%向甲方指定的酒店销售人员支付业务报酬，该费用由甲方从应付货款中直接扣除。\\n*   **退换货：** 甲方有权对不适销、包装损坏、存在质量问题或临期（保质期剩余不足90天）的商品进行退换货，相关费用由乙方承担。合同期满后，未售完的库存商品全部退还给乙方。\\n*   **违约责任：** 合同对乙方延期交货、商品质量不合格、违反承诺等行为设置了严格的违约金条款（如每日1%的延迟违约金，单次15%的违约金等），并明确甲方有权追偿包括律师费、诉讼费在内的全部损失。\\n*   **争议解决：** 协商不成时，可依法向甲方住所地（即深圳市盐田区）有管辖权的人民法院起诉。\\n\\n**3. 关键风险提示**\\n\\n*   **甲方单方优势地位风险：** 合同条款明显倾向于保护甲方利益。例如，甲方可单方决定零售价、对不适销商品进行退换货、以自身收银系统记录为唯一结算依据、在价格变动时适用对自身最有利的价格等。\\n*   **结算周期长且条件苛刻：** 从销售发生到乙方收到货款，需经历月度对账、开票、45个工作日账期，整体回款周期可能长达2-3个月，对乙方现金流压力较大。\\n*   **销售激励费用风险：** 乙方需额外支付2%的销售激励费用，且由甲方直接扣除，增加了乙方的实际成本。\\n*   **无限责任与高额违约金风险：** 合同约定乙方需对因商品问题导致的消费者索赔承担全部责任，且甲方的追偿范围包括间接损失及高达300%的利息。同时，多项违约情形设置了高达合同总金额15%-20%的违约金，","reviewedIssues":"[{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到合同编号\\",\\"suggestion\\":\\"建议补充唯一合同编号，方便归档和追溯\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失或无效\\",\\"severity\\":\\"medium\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到有效合同金额\\",\\"suggestion\\":\\"建议明确合同金额、币种、税费和付款安排\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到质保金或质量保障安排\\",\\"suggestion\\":\\"如适用，建议明确质保金比例、扣留和返还条件\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"low\\",\\"source\\":\\"rule\\",\\"evidence\\":\\"\\",\\"reason\\":\\"未识别到保险要求\\",\\"suggestion\\":\\"如涉及施工、服务外包或高风险履约，建议明确保险种类、保额和有效期\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"发票类型错误，应为增值税专用发票而非普通发票\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第1项：甲方在双方核对无误且收到乙方提供的等额合法增值税普通发票（税率为【3】%）后的【45】个工作日内...\\",\\"reason\\":\\"甲方为一般纳税人，需要增值税专用发票用于进项抵扣。普通发票无法抵扣，将增加甲方税务成本。且合同其他部分要求专用发票，前后矛盾。\\",\\"suggestion\\":\\"将「增值税普通发票」改为「增值税专用发票」。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"销售激励费用存在商业贿赂风险\\",\\"severity\\":\\"high\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条“销售激励费用”：为激励甲方（酒店）销售团队推广乙方产品，双方同意，乙方应按照本协议约定向甲方指定的酒店销售人员支付销售业务报酬...由甲方从应付乙方的货款中直接扣除该笔费用。\\",\\"reason\\":\\"直接向甲方员工支付报酬可能被认定为商业贿赂，违反《反不正当竞争法》及甲方内部廉洁规定。且甲方代扣代付可能使甲方承担连带责任。\\",\\"suggestion\\":\\"建议删除该条款，或改为乙方以折扣、返利等形式直接给予甲方（酒店）商业折扣，由甲方自行决定内部激励方式。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同金额缺失\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页：合同金额：¥0.00万\\",\\"reason\\":\\"代销合同虽无固定金额，但应明确预估金额或最低销售额，否则无法计算违约金基数（如合同总金额的20%）。\\",\\"suggestion\\":\\"建议增加预估年度代销金额，或约定违约金按实际销售额的一定比例计算。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"质保金或质量保障安排不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及质保金。\\",\\"reason\\":\\"无质保金或质量保证金，甲方在乙方违约时缺乏直接扣款保障。\\",\\"suggestion\\":\\"建议增加条款，约定从应付货款中预留10%作为质量保证金，质保期满后无息退还。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"保险要求不明确\\",\\"severity\\":\\"medium\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"全文未提及保险。\\",\\"reason\\":\\"商品在代销期间可能发生毁损、灭失或造成第三方损害，乙方未投保将增加甲方风险。\\",\\"suggestion\\":\\"建议增加条款，要求乙方投保产品责任险，保额不低于人民币100万元，并将甲方列为附加被保险人。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"合同编号缺失\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"合同首页无编号。\\",\\"reason\\":\\"不利于合同归档和追溯。\\",\\"suggestion\\":\\"建议补充唯一合同编号。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"第十一条第（三）款第2项要求增值税专用发票，与第1项矛盾\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十一条第（三）款第2项：乙方必须按照国家有关规定，向甲方提供合法有效的增值税专用发票。\\",\\"reason\\":\\"前后条款冲突，可能导致结算争议。\\",\\"suggestion\\":\\"统一为增值税专用发票，删除第1项中的“普通”二字。\\",\\"confidence\\":1,\\"needHumanReview\\":false},{\\"title\\":\\"退换货条款中“30个工作日”过长\\",\\"severity\\":\\"low\\",\\"source\\":\\"ai\\",\\"evidence\\":\\"第十条第（七）款第2项：甲方提交“退（换）货单”30个工作日之内，乙方需将上述退货商品提走\\",\\"reason\\":\\"30个工作日过长，可能导致商品积压。\\",\\"suggestion\\":\\"建议缩短为10个工作日。\\",\\"confidence\\":1,\\"needHumanReview\\":false}]","createdAt":"2026-06-26T17:38:24.230Z"}	jl;akdsjf	20	2
\.


--
-- Data for Name: audit_records; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.audit_records (id, contract_id, risk_score, issues_count, status, analysis, suggestions, summary, template_id, template_version, template_content_snapshot, contract_type, extracted_fields, rule_issues, ai_issues, reviewed_issues, need_human_review_count, audit_version, created_at, reviewed_by) FROM stdin;
\.


--
-- Data for Name: audit_templates; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.audit_templates (id, contract_type, name, content, summary_content, version, updated_by, created_at, updated_at) FROM stdin;
4d3429bc-1d17-42fd-b153-83f7267014fe	租赁	租赁合同	# 租赁合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 租赁标的权属、租金押金、税费承担、维修责任、提前解约、到期交还。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼租赁文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.345	2026-06-06 17:50:39.203
a2f00014-d698-4448-8201-c4ab3d342581	服务外包	服务外包合同	# 服务外包合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 外包边界、驻场/非驻场管理、人员替换、工伤与用工风险、服务质量、考核扣款、保密合规。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼服务外包文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.342	2026-06-06 17:51:20.96
440c88f7-d396-45b8-b6bb-e1cfa9711db0	工程	工程合同	# 工程合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 工程范围、图纸清单、工期、签证变更、验收结算、质保金、安全责任、保险。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼工程文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.346	2026-06-06 17:51:05.647
878d27db-8809-4d2d-8d9e-fe65fa368489	技术	技术合同	# 技术合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 技术交付物、里程碑、验收测试、源代码/账号、知识产权、数据安全、运维质保。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼技术文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.348	2026-06-06 17:51:11.11
87847863-44a8-4676-afd2-d49dc397c753	营销	营销合同	# 营销合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 营销目标、投放渠道、KPI、素材权利、广告合规、肖像/商标授权、费用结算。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼营销文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.352	2026-06-06 17:51:26.873
1b95e79b-1b3d-4f4b-b53e-84dbb70ca03f	人力资源	人力资源合同	# 人力资源合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 用工性质、人员资质、社保个税、工伤责任、个人信息、竞业保密、终止交接。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼人力资源文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.35	2026-06-06 17:50:18.968
1273501c-319a-4476-ba40-6f3077903c79	广告文案	广告文案	# 广告文案合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 绝对化用语、虚假宣传、价格表述、品牌调性、错别字、敏感词、知识产权。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼广告文案文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.354	2026-06-06 17:50:26.906
8a00b912-3ec3-4bb1-9a5a-89dc7e11f77d	服务	服务合同	# 服务合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 服务范围、人员资质、服务标准、验收口径、付款节点、发票税率、数据安全、违约及赔偿。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼服务文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.34	2026-06-06 17:50:32.297
c590b464-db0e-404d-a8dd-c1ad0d2dd3b7	采购	采购合同	# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	请提炼采购文件的合同名称、签订方、金额、期限、付款/结算、附件清单、关键风险和需要人工复核事项。	2	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-06 17:17:14.337	2026-06-06 17:50:53.454
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.contracts (id, name, party_a, party_b, type, status, amount, amount_excluding_tax, tax_rate, quality_deposit, contract_no, start_date, end_date, contract_term, risk_level, insurance_info, insurance_date, file_path, insurance_file_path, is_audit_draft, follow_dept, cost_dept, cost_code, created_at, user_id, sealed_file_path, archive_status, sealed_uploaded_by, sealed_uploaded_at, sealed_verification_status, sealed_verification_report, approval_submitted_at, approval_approved_at) FROM stdin;
01e4657e-04b3-4d7d-aa3f-4b78a77305c5	清洁剂采购合同	深圳市特发小梅沙投资发展有限公司深圳美高梅酒店	北京云起风扬商业发展有限公司	采购	draft	0	0	0			2026-07-01	2027-03-20		low			contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	\N	t				2026-06-13 04:37:18.64	2d2dc4c4-6cf4-426c-9032-e055447815c8	\N	not_started	\N	\N	\N	\N	\N	\N
0d03081a-c7e3-40ea-afeb-0c8b9220ed70	测试审批流程	深圳美高梅酒店	测试供应商	采购	pending_approval	0	0	0			2026-01-01	2026-12-31		low			contract/测试审批流程测试供应商.txt	\N	t				2026-06-13 04:35:42.312	2d2dc4c4-6cf4-426c-9032-e055447815c8	\N	not_started	\N	\N	\N	\N	\N	\N
ffe05ebc-9ed8-4fe5-a2c8-52e21d749344	清洁剂采购合同	深圳市特发小梅沙投资发展有限公司深圳美高梅酒店	北京云起风扬商业发展有限公司	采购	pending_approval	0	0	0			2026-07-01	2027-03-20		low			contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	\N	t				2026-06-13 04:43:21.287	2d2dc4c4-6cf4-426c-9032-e055447815c8	\N	not_started	\N	\N	\N	\N	\N	\N
1c138f6b-2778-48f2-b357-a00ca672bf79	代销合同	深圳市特发小梅沙投资发展有限公司深圳美高梅酒店	三亚辰檬贸易有限公司	采购	pending_archive	0	0	0			2026-06-05	2028-06-04		high			contract/深圳美高梅酒店精品店泳衣泳具代销合同-三亚辰檬贸易有限公司待提取.doc	\N	f	财务部			2026-06-26 17:37:50.059	9b768321-9f6d-41cf-a761-a1df265c4a06	\N	pending_upload	\N	\N	\N	\N	2026-06-26 17:51:58.84	2026-06-26 18:00:25.082
\.


--
-- Data for Name: custom_roles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.custom_roles (id, name, description, is_system, created_at) FROM stdin;
acd91f8c-0be4-4a46-ab8f-bb03304eb178	部门文员		f	2026-06-06 17:33:51.879
a4aa0074-8d7a-4066-9fe5-f412af699038	部门负责人		f	2026-06-06 17:34:14.045
0d8492e6-b8e1-4972-a55e-c88828919c77	财务部文员		f	2026-06-06 17:34:26.625
6990fafd-6c45-41ae-a00f-bc88e10e5d18	财务部收货员		f	2026-06-06 17:34:40.061
91eac96c-337a-4cc7-aa05-5e41ce956fc6	财务部采购员		f	2026-06-06 17:34:58.887
6329910b-11b1-42d3-97d2-581782bdb0ee	财务总监		f	2026-06-06 17:35:05.108
a9e9c381-03d7-4c0c-a767-ca317a55a55c	总经理		f	2026-06-06 17:35:15.279
699bd21f-ae84-49c0-bb7a-4ab408901767	业主代表		f	2026-06-06 17:35:20.723
13a272a9-5be3-439a-af1b-02b6b0128c0c	合同管理员		f	2026-06-13 05:32:10.625
6e8248a9-0f71-4145-9462-799645524828	系统管理员		f	2026-06-13 05:32:16.826
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.departments (id, code, short_name, name, head_name, created_at) FROM stdin;
1f762c7a-83ea-4faf-ae0b-d8a3db6f5742	01001	FO	前厅部	杨超	2026-06-06 17:39:37.014
63f2b6d4-3a4a-4ff4-981a-7d7ba32e5e07	04100	FIN	财务部	黄守兵	2026-06-13 04:47:17.768
84d035e5-664c-4e2a-898f-3883438bd167	04200	EO	行政办	李光鹏	2026-06-13 04:47:54.682
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.notification_preferences (id, user_id, type, email_enabled, in_app_enabled) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.notifications (id, user_id, type, title, content, module, ref_id, is_read, created_at) FROM stdin;
accf820c-6faa-437b-b4f7-d1a0e83b63e1	9b768321-9f6d-41cf-a761-a1df265c4a06	approval	有新的合同需要审批: 清洁剂采购合同	\N	contract	1633fc3b-01f5-4fe4-8904-877d09150a33	t	2026-06-26 17:23:45.315
6a8a9def-97bf-4b2c-a75f-8f5702bfc44b	9b768321-9f6d-41cf-a761-a1df265c4a06	approval	有新的合同需要审批: 代销合同	\N	contract	1c138f6b-2778-48f2-b357-a00ca672bf79	t	2026-06-26 17:39:47.128
67c1565a-f66f-47d0-8a54-16088f991661	9b768321-9f6d-41cf-a761-a1df265c4a06	approval	有新的合同需要审批: 清洁剂采购合同	\N	contract	2cc7e43b-8c64-4bfe-a7bc-6b102b37f423	t	2026-06-26 17:37:02.331
846a9de4-ff13-4258-8d84-5ad3bcda4ff7	9b768321-9f6d-41cf-a761-a1df265c4a06	approval	有新的合同需要审批: 代销合同	\N	contract	1c138f6b-2778-48f2-b357-a00ca672bf79	t	2026-06-26 17:51:58.866
17d9087c-af6a-4597-8570-2ba0416f8daf	7095ccb5-1a06-488e-a275-d26489367bc2	approval	有新的合同需要审批: 代销合同	\N	contract	1c138f6b-2778-48f2-b357-a00ca672bf79	t	2026-06-26 17:51:58.88
118a0f9e-0707-4120-b6f2-6a3106b2fa24	9b768321-9f6d-41cf-a761-a1df265c4a06	approval	您的合同已通过审批，请上传双方盖章合同扫描件完成归档	\N	contract	1c138f6b-2778-48f2-b357-a00ca672bf79	f	2026-06-26 18:00:25.089
3226a5b4-82ef-49ff-bf49-076443bd55ad	600189e4-7476-4e86-bf57-dd1c4bdac059	approval	有新的合同需要审批: 代销合同	\N	contract	1c138f6b-2778-48f2-b357-a00ca672bf79	t	2026-06-26 17:51:58.893
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.permissions (id, module, action, description) FROM stdin;
c8917a05-ab0a-449b-acb1-96e311f7dbe8	dashboard	view	查看工作台
5fa399f1-c842-4a22-89d1-781ea55c0ea1	projects	view	查看项目管理
df7c6e11-e331-488e-a637-0d3568c7d09d	projects	create	新建项目
0fffc0bc-d985-40e8-bbf3-d401ee4e79ba	projects	edit	编辑项目
16858dc3-b6f5-4954-a662-f605abf91a0d	projects	delete	删除项目
589ce806-8d80-432d-bfde-e7b759e9b8c2	projects	manage_members	管理项目成员
0ea0b34a-b2ad-4083-94e0-fee8deeb547a	procurement	view	查看采购管理
5f627b1e-b6d1-470b-ade2-221fa7c22fae	procurement	create	新建采购申请
fa36a319-79ac-40c6-9537-78a043733d0a	procurement	edit	编辑采购申请
9c306452-fe67-4de4-9f4b-dbeb9c71b5f4	procurement	delete	删除采购申请
5434e722-00cd-4a62-bdfe-ab6449c7bec3	procurement	approve	审批采购申请
b652c003-9d0f-4ed2-99f9-433a3c4fe6f2	procurement	manage_suppliers	管理供应商
3596a211-7ff0-4140-9e95-9e13d82b2f21	contracts	view	查看合同管理
2eefc0ca-3cfa-4f9d-bff0-7d91b636f3f1	contracts	create	新建合同
60e4f48b-e332-4f06-8a49-ec7f19d2fef8	contracts	edit	编辑合同
fc550f94-bd91-4088-a1b8-61b5fac84e7f	contracts	delete	删除合同
d3b047b3-79fc-467a-94e6-d0e3612d72ce	contracts	export	导出合同台账
8c7189e3-1083-4919-a5d4-0d583a8bac3d	contracts	submit_approval	提交合同审批
aceb3952-3da9-4d58-aa99-7eedb10ec926	contracts	manage_files	管理合同/保单扫描件
9d3985f5-236a-4e47-bebb-a8980d718a43	audit	view	查看 AI 审核
30f74424-9e4e-4fe0-9a2e-a6f5811247b0	audit	analyze	执行 AI 审核
7e4637d8-1c08-4c34-97e2-32c19a8c78f2	audit	download	下载审核报告
6ee403b0-157c-48b3-b184-9c54aaa41850	audit	clear	清除审核记录
05230032-02f1-4aa7-b8e1-79e710126dfd	approvals	view	查看审批中心
ae5bc078-c638-452c-b89c-727f77f41a90	approvals	approve	批准/驳回审批
77dda8d8-1c3f-4c0d-8bb7-64b1591a84a5	notifications	view	查看通知
530b7c05-b930-48c5-802a-ab7cb8a7828a	reminders	view	查看提醒
c9189a44-c2ed-437c-bb34-8c8815a52b84	statistics	view	查看数据统计
adafd486-8b46-426c-a693-16818d8a95e4	settings	view	查看系统设置
9383ecb3-9eff-4f45-9d9b-e7084d764206	settings	manage_users	管理用户
bcf2461c-c938-46b2-af8e-edff9dec4337	settings	manage_roles	管理角色与权限
988b99d0-1d48-4b17-bc09-aa36ca7f32c4	settings	manage_audit_config	管理审核配置
880cf892-380c-4e50-8351-a07f23caa6f7	settings	manage_approval_flows	管理审批流
5bff1ceb-c4eb-44b4-8b46-c843a2fe853a	settings	manage_departments	管理部门
76d106f6-ad08-45cc-b29b-3f6aa0bfc455	settings	manage_storage	管理存储配置
5f4216df-6361-44fd-8c79-6227e48c16a9	projects	manage_files	管理项目支持文件
6dabd23a-5842-4661-9b94-c98bb2ee4527	projects	submit_completion	提交项目完成审批
\.


--
-- Data for Name: procurement_requests; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.procurement_requests (id, title, description, category, amount, quantity, unit, requester_id, department, status, urgency, reason, supplier_id, purchase_order_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: progress_updates; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.progress_updates (id, task_id, user_id, progress, note, created_at) FROM stdin;
\.


--
-- Data for Name: project_files; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.project_files (id, project_id, filename, original_name, size, mime_type, file_type, uploaded_by, uploaded_at) FROM stdin;
fb991224-ce9d-4276-9c79-7df11e163030	a8676196-de2d-47ec-b6f3-940376485611	ce749eac-25e5-4c34-99dd-16e4dde169ac.docx	åå®¢äº§åè¯ç¨åè®®-å®¡æ ¸æ¥å.docx	43300	application/vnd.openxmlformats-officedocument.wordprocessingml.document	support	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-27 02:03:43.613
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.project_members (id, project_id, user_id, role) FROM stdin;
2c50d040-d728-456a-b56b-2393134a3966	a8676196-de2d-47ec-b6f3-940376485611	2d2dc4c4-6cf4-426c-9032-e055447815c8	admin
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.projects (id, name, description, status, start_date, end_date, created_at, updated_at, department, priority, type, progress, owner_id, target_name, target_date, countdown_mode, countdown_label, completion_note, completion_submitted_at, completion_approved_at) FROM stdin;
a8676196-de2d-47ec-b6f3-940376485611	A酒店筹开项目		active	2026-06-01 00:00:00	2027-06-30 00:00:00	2026-06-06 17:31:40.9	2026-06-27 02:00:46.057	\N	medium	hotel_preopening	0	\N	\N	\N	f	\N	\N	\N	\N
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.purchase_orders (id, order_no, supplier_id, total_amount, status, ordered_date, received_date, remark, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.reminders (id, contract_id, contract_name, days_remaining, type, priority, description, created_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.role_permissions (id, role_id, permission_id) FROM stdin;
b15793b1-183b-40f4-9a12-5b6955546d1a	6e8248a9-0f71-4145-9462-799645524828	c8917a05-ab0a-449b-acb1-96e311f7dbe8
e00c3cfa-659a-4e23-a3f2-384873cfbbdf	6e8248a9-0f71-4145-9462-799645524828	df7c6e11-e331-488e-a637-0d3568c7d09d
2dfc578b-9c9e-4736-bf7d-3598c056254b	6e8248a9-0f71-4145-9462-799645524828	16858dc3-b6f5-4954-a662-f605abf91a0d
cf0324ce-422e-4e5d-b58a-09468e15eb2f	6e8248a9-0f71-4145-9462-799645524828	0fffc0bc-d985-40e8-bbf3-d401ee4e79ba
0e065807-e72c-448f-8f2b-084a71e2a0e6	6e8248a9-0f71-4145-9462-799645524828	589ce806-8d80-432d-bfde-e7b759e9b8c2
c5b4ed05-853f-4229-be5f-12e08a74b41e	6e8248a9-0f71-4145-9462-799645524828	5fa399f1-c842-4a22-89d1-781ea55c0ea1
0e565a99-4b84-4bf5-bbfe-a6e8b91bc82d	6e8248a9-0f71-4145-9462-799645524828	5434e722-00cd-4a62-bdfe-ab6449c7bec3
7b5471bc-c338-4374-970f-54cad40a7d28	6e8248a9-0f71-4145-9462-799645524828	5f627b1e-b6d1-470b-ade2-221fa7c22fae
7a4180f6-1921-46bc-9537-e943c8ccacd2	6e8248a9-0f71-4145-9462-799645524828	9c306452-fe67-4de4-9f4b-dbeb9c71b5f4
7f48f38c-def1-4a48-875a-50bd366084cb	6e8248a9-0f71-4145-9462-799645524828	fa36a319-79ac-40c6-9537-78a043733d0a
61b5b976-04f7-4c11-9fb1-0f85c28db2e1	6e8248a9-0f71-4145-9462-799645524828	b652c003-9d0f-4ed2-99f9-433a3c4fe6f2
379ce190-178d-48c8-b7da-4273ec9c244d	6e8248a9-0f71-4145-9462-799645524828	0ea0b34a-b2ad-4083-94e0-fee8deeb547a
708c9d8c-75f5-40fc-9524-442e7d63b2dc	6e8248a9-0f71-4145-9462-799645524828	2eefc0ca-3cfa-4f9d-bff0-7d91b636f3f1
7f0b66a6-7ad7-427a-aa7e-1b10c649dc3d	6e8248a9-0f71-4145-9462-799645524828	fc550f94-bd91-4088-a1b8-61b5fac84e7f
595451e4-89e8-4089-83b5-fd95b53a8169	6e8248a9-0f71-4145-9462-799645524828	60e4f48b-e332-4f06-8a49-ec7f19d2fef8
216635ba-318f-4ce1-ade5-6e143052b04c	6e8248a9-0f71-4145-9462-799645524828	d3b047b3-79fc-467a-94e6-d0e3612d72ce
d7d70f97-da24-4c93-89dd-dc5bdbd94443	6e8248a9-0f71-4145-9462-799645524828	aceb3952-3da9-4d58-aa99-7eedb10ec926
bd2971c3-30eb-4afe-9cc0-41eb6d497a60	6e8248a9-0f71-4145-9462-799645524828	8c7189e3-1083-4919-a5d4-0d583a8bac3d
efbcd54a-3394-41ce-99f8-9a395cfd28e9	6e8248a9-0f71-4145-9462-799645524828	3596a211-7ff0-4140-9e95-9e13d82b2f21
1316ed20-4788-47bc-8463-dd31e0d2294f	6e8248a9-0f71-4145-9462-799645524828	30f74424-9e4e-4fe0-9a2e-a6f5811247b0
914288ac-bd36-4663-9340-703bfcbb8f57	6e8248a9-0f71-4145-9462-799645524828	6ee403b0-157c-48b3-b184-9c54aaa41850
1ff0ecd4-7329-461d-9130-ca7bedd253eb	6e8248a9-0f71-4145-9462-799645524828	7e4637d8-1c08-4c34-97e2-32c19a8c78f2
ab26483a-ecb9-4001-b2a5-05bd0eae3b63	6e8248a9-0f71-4145-9462-799645524828	9d3985f5-236a-4e47-bebb-a8980d718a43
1819753f-e1d5-4f4e-8754-6955a74a5411	6e8248a9-0f71-4145-9462-799645524828	ae5bc078-c638-452c-b89c-727f77f41a90
59f8ae8f-ffdf-4051-831a-503e64109751	6e8248a9-0f71-4145-9462-799645524828	05230032-02f1-4aa7-b8e1-79e710126dfd
b37c73ac-5abc-40fd-891b-4df7d9c5af53	6e8248a9-0f71-4145-9462-799645524828	77dda8d8-1c3f-4c0d-8bb7-64b1591a84a5
d74a891d-3352-4f6e-82b1-a1e2cc2ab8de	6e8248a9-0f71-4145-9462-799645524828	530b7c05-b930-48c5-802a-ab7cb8a7828a
84e4415a-56b8-4aa6-b747-797938ff5430	6e8248a9-0f71-4145-9462-799645524828	c9189a44-c2ed-437c-bb34-8c8815a52b84
c1e9589e-8992-4bfd-97f4-de90b7713066	6e8248a9-0f71-4145-9462-799645524828	880cf892-380c-4e50-8351-a07f23caa6f7
2e2a802a-b4b3-436e-80ce-2be0a1bb19fa	6e8248a9-0f71-4145-9462-799645524828	988b99d0-1d48-4b17-bc09-aa36ca7f32c4
14b2e1f5-02e7-422b-8edc-04b55515d4a4	6e8248a9-0f71-4145-9462-799645524828	5bff1ceb-c4eb-44b4-8b46-c843a2fe853a
5a048d54-bf66-47db-9d3c-e49d7e53ae54	6e8248a9-0f71-4145-9462-799645524828	bcf2461c-c938-46b2-af8e-edff9dec4337
b680cbbe-7179-41eb-9e37-7a8aad57ccce	6e8248a9-0f71-4145-9462-799645524828	76d106f6-ad08-45cc-b29b-3f6aa0bfc455
0d29406f-c828-4225-95dd-e001899367ce	6e8248a9-0f71-4145-9462-799645524828	9383ecb3-9eff-4f45-9d9b-e7084d764206
9e95269e-0edc-4f1b-9988-fef0a862a1a7	6e8248a9-0f71-4145-9462-799645524828	adafd486-8b46-426c-a693-16818d8a95e4
380beea7-141d-4748-9b70-2e6e512adf4b	13a272a9-5be3-439a-af1b-02b6b0128c0c	c8917a05-ab0a-449b-acb1-96e311f7dbe8
3e96e9e7-e2a5-4bca-9731-dfec46b1d4fe	13a272a9-5be3-439a-af1b-02b6b0128c0c	2eefc0ca-3cfa-4f9d-bff0-7d91b636f3f1
294d046b-6821-4b27-abc6-7a4a0302f71e	13a272a9-5be3-439a-af1b-02b6b0128c0c	fc550f94-bd91-4088-a1b8-61b5fac84e7f
00da5389-5f0f-487f-9c48-a43b4d2ec40e	13a272a9-5be3-439a-af1b-02b6b0128c0c	60e4f48b-e332-4f06-8a49-ec7f19d2fef8
04f59ba3-dae9-41c6-98b6-a71d9b158092	13a272a9-5be3-439a-af1b-02b6b0128c0c	d3b047b3-79fc-467a-94e6-d0e3612d72ce
8fa3679f-e7fd-4061-a4a8-68284061114d	13a272a9-5be3-439a-af1b-02b6b0128c0c	aceb3952-3da9-4d58-aa99-7eedb10ec926
48b478f7-6b53-4b0f-9137-1610e080a0e1	13a272a9-5be3-439a-af1b-02b6b0128c0c	8c7189e3-1083-4919-a5d4-0d583a8bac3d
efb13c76-9543-41ee-a44a-4637914da641	13a272a9-5be3-439a-af1b-02b6b0128c0c	3596a211-7ff0-4140-9e95-9e13d82b2f21
6383ddda-41a4-422d-8ee0-39cf32b56992	13a272a9-5be3-439a-af1b-02b6b0128c0c	77dda8d8-1c3f-4c0d-8bb7-64b1591a84a5
3fec6241-8620-4cd3-9a52-bf363ace0953	13a272a9-5be3-439a-af1b-02b6b0128c0c	ae5bc078-c638-452c-b89c-727f77f41a90
793c4378-2f15-4bb8-a641-814efe092912	13a272a9-5be3-439a-af1b-02b6b0128c0c	05230032-02f1-4aa7-b8e1-79e710126dfd
067a68a1-3adb-4492-a707-623080123bfb	a9e9c381-03d7-4c0c-a767-ca317a55a55c	c8917a05-ab0a-449b-acb1-96e311f7dbe8
f4ea5100-7063-49bd-b2a2-304b490a9c0d	a9e9c381-03d7-4c0c-a767-ca317a55a55c	df7c6e11-e331-488e-a637-0d3568c7d09d
aa120816-94e7-4bac-8425-fe04574db5ee	a9e9c381-03d7-4c0c-a767-ca317a55a55c	16858dc3-b6f5-4954-a662-f605abf91a0d
3fab1178-63d7-4fb5-b999-af3fb3972f91	a9e9c381-03d7-4c0c-a767-ca317a55a55c	0fffc0bc-d985-40e8-bbf3-d401ee4e79ba
ba5bf59c-c07b-441e-9933-39c8d4220ccd	a9e9c381-03d7-4c0c-a767-ca317a55a55c	589ce806-8d80-432d-bfde-e7b759e9b8c2
71df9291-4058-4abc-aff7-9e9a7ce53fe3	a9e9c381-03d7-4c0c-a767-ca317a55a55c	5fa399f1-c842-4a22-89d1-781ea55c0ea1
76096bf5-bae6-417a-81fb-95ba45aec90c	a9e9c381-03d7-4c0c-a767-ca317a55a55c	5434e722-00cd-4a62-bdfe-ab6449c7bec3
5366bdd3-ed7f-4089-ac69-63f06b9b39a6	a9e9c381-03d7-4c0c-a767-ca317a55a55c	5f627b1e-b6d1-470b-ade2-221fa7c22fae
05859c1e-b30f-4917-99b3-ae582931ca79	a9e9c381-03d7-4c0c-a767-ca317a55a55c	9c306452-fe67-4de4-9f4b-dbeb9c71b5f4
9d0a0eb8-6dbb-42da-8504-965fc9b023fe	a9e9c381-03d7-4c0c-a767-ca317a55a55c	fa36a319-79ac-40c6-9537-78a043733d0a
20fd0c37-1f46-40ee-81c6-8c7d64d235a0	a9e9c381-03d7-4c0c-a767-ca317a55a55c	b652c003-9d0f-4ed2-99f9-433a3c4fe6f2
b21cf285-7b8d-44c3-aba4-761741adbb3b	a9e9c381-03d7-4c0c-a767-ca317a55a55c	0ea0b34a-b2ad-4083-94e0-fee8deeb547a
bb6de179-f349-4975-8f50-975c115b6305	a9e9c381-03d7-4c0c-a767-ca317a55a55c	2eefc0ca-3cfa-4f9d-bff0-7d91b636f3f1
3fb245f3-e6a7-4e17-a89a-73ada8988b21	a9e9c381-03d7-4c0c-a767-ca317a55a55c	fc550f94-bd91-4088-a1b8-61b5fac84e7f
328b1866-385b-4f09-89ab-1c1adfe0dd10	a9e9c381-03d7-4c0c-a767-ca317a55a55c	60e4f48b-e332-4f06-8a49-ec7f19d2fef8
db429007-1d15-4225-b8cb-0c66a26b34cc	a9e9c381-03d7-4c0c-a767-ca317a55a55c	d3b047b3-79fc-467a-94e6-d0e3612d72ce
78bf64e5-5287-4dd8-9c92-039905803b9a	a9e9c381-03d7-4c0c-a767-ca317a55a55c	aceb3952-3da9-4d58-aa99-7eedb10ec926
9f628bce-fbbc-4d1a-834b-9e86c55475dc	a9e9c381-03d7-4c0c-a767-ca317a55a55c	8c7189e3-1083-4919-a5d4-0d583a8bac3d
fb411350-f7ee-44d0-b58a-c75b23ccbe60	a9e9c381-03d7-4c0c-a767-ca317a55a55c	3596a211-7ff0-4140-9e95-9e13d82b2f21
4c0898f6-b736-44eb-88f6-16722dcff78c	a9e9c381-03d7-4c0c-a767-ca317a55a55c	30f74424-9e4e-4fe0-9a2e-a6f5811247b0
80f26e4e-5be4-431c-8770-d395068ebb48	a9e9c381-03d7-4c0c-a767-ca317a55a55c	6ee403b0-157c-48b3-b184-9c54aaa41850
58efe4bd-22cd-4e47-9671-8749c2e18e53	a9e9c381-03d7-4c0c-a767-ca317a55a55c	7e4637d8-1c08-4c34-97e2-32c19a8c78f2
2dd84fa4-e2a9-4d7a-b8e9-d9560fbcb00a	a9e9c381-03d7-4c0c-a767-ca317a55a55c	9d3985f5-236a-4e47-bebb-a8980d718a43
a9cb8012-896a-4d90-bcd6-9ef61bf098d5	a9e9c381-03d7-4c0c-a767-ca317a55a55c	ae5bc078-c638-452c-b89c-727f77f41a90
eb305f77-07ae-4b96-ac3a-b7387c2fc163	a9e9c381-03d7-4c0c-a767-ca317a55a55c	05230032-02f1-4aa7-b8e1-79e710126dfd
b508e504-57b6-46d8-9e20-43759cc2c181	a9e9c381-03d7-4c0c-a767-ca317a55a55c	77dda8d8-1c3f-4c0d-8bb7-64b1591a84a5
ddba218f-cbf3-4b28-a379-2bcd6d0875a3	a9e9c381-03d7-4c0c-a767-ca317a55a55c	530b7c05-b930-48c5-802a-ab7cb8a7828a
362e547d-48a7-46f5-bc1c-28fd91ac99ea	a9e9c381-03d7-4c0c-a767-ca317a55a55c	c9189a44-c2ed-437c-bb34-8c8815a52b84
68267f49-aede-4977-9c44-f2b0cfffe89e	a9e9c381-03d7-4c0c-a767-ca317a55a55c	880cf892-380c-4e50-8351-a07f23caa6f7
ed3a6e02-ff0b-4392-9a98-188d13e04ce8	a9e9c381-03d7-4c0c-a767-ca317a55a55c	988b99d0-1d48-4b17-bc09-aa36ca7f32c4
115dcc80-4fbe-43a6-adf0-c7df72540bb7	a9e9c381-03d7-4c0c-a767-ca317a55a55c	5bff1ceb-c4eb-44b4-8b46-c843a2fe853a
caf9e99a-797e-4eb1-b43d-ad182140e6de	a9e9c381-03d7-4c0c-a767-ca317a55a55c	bcf2461c-c938-46b2-af8e-edff9dec4337
141488dc-64cf-4e27-9725-8cf62d007d09	a9e9c381-03d7-4c0c-a767-ca317a55a55c	76d106f6-ad08-45cc-b29b-3f6aa0bfc455
09ca808c-f16c-4de7-96a1-3f2eb81d278b	a9e9c381-03d7-4c0c-a767-ca317a55a55c	9383ecb3-9eff-4f45-9d9b-e7084d764206
9b72f7ec-f687-45cb-a6a3-de001303c577	a9e9c381-03d7-4c0c-a767-ca317a55a55c	adafd486-8b46-426c-a693-16818d8a95e4
cab06adc-f312-49fd-a029-0c487b9b716c	699bd21f-ae84-49c0-bb7a-4ab408901767	880cf892-380c-4e50-8351-a07f23caa6f7
af1b52f9-3f79-48e5-afdc-f6aab4ecaa32	699bd21f-ae84-49c0-bb7a-4ab408901767	988b99d0-1d48-4b17-bc09-aa36ca7f32c4
8036d8dd-2286-41b7-ade2-2faecdcaa165	699bd21f-ae84-49c0-bb7a-4ab408901767	5bff1ceb-c4eb-44b4-8b46-c843a2fe853a
a50cbe68-5af5-40c7-9aee-ac30723f0975	699bd21f-ae84-49c0-bb7a-4ab408901767	bcf2461c-c938-46b2-af8e-edff9dec4337
28cb3dc2-8c97-47e4-b83b-e5bc3cad0fe8	699bd21f-ae84-49c0-bb7a-4ab408901767	76d106f6-ad08-45cc-b29b-3f6aa0bfc455
6ae7d10a-6163-4f8f-a8f0-1455e80ee89a	699bd21f-ae84-49c0-bb7a-4ab408901767	9383ecb3-9eff-4f45-9d9b-e7084d764206
e1c7de26-d4a1-4cba-bf7e-f953c83c83fd	699bd21f-ae84-49c0-bb7a-4ab408901767	adafd486-8b46-426c-a693-16818d8a95e4
6b74647e-425f-4e6b-aa0c-55e930700c54	699bd21f-ae84-49c0-bb7a-4ab408901767	c9189a44-c2ed-437c-bb34-8c8815a52b84
c64fb645-bda5-4d2c-b1c7-26b4f14044a2	699bd21f-ae84-49c0-bb7a-4ab408901767	530b7c05-b930-48c5-802a-ab7cb8a7828a
8b0f8550-6a4f-44c6-b7be-0524a19d2b8e	699bd21f-ae84-49c0-bb7a-4ab408901767	77dda8d8-1c3f-4c0d-8bb7-64b1591a84a5
dd19aa66-d810-4f2a-96ec-fa99655e4346	699bd21f-ae84-49c0-bb7a-4ab408901767	ae5bc078-c638-452c-b89c-727f77f41a90
38fec555-6a9e-4eb8-90a6-f8c92eb2b35d	699bd21f-ae84-49c0-bb7a-4ab408901767	05230032-02f1-4aa7-b8e1-79e710126dfd
6b7dbd78-919e-4dc4-add2-1510d16d5b0f	699bd21f-ae84-49c0-bb7a-4ab408901767	30f74424-9e4e-4fe0-9a2e-a6f5811247b0
7d86c599-14db-4ce2-aaf7-791423fb9231	699bd21f-ae84-49c0-bb7a-4ab408901767	6ee403b0-157c-48b3-b184-9c54aaa41850
0e7e39a8-6ad4-40fa-b173-592f99c0621a	699bd21f-ae84-49c0-bb7a-4ab408901767	7e4637d8-1c08-4c34-97e2-32c19a8c78f2
596029a6-781e-470d-afd6-4323cf6476f2	699bd21f-ae84-49c0-bb7a-4ab408901767	9d3985f5-236a-4e47-bebb-a8980d718a43
e94857cb-8c13-48d6-8b6a-5e740065d39d	699bd21f-ae84-49c0-bb7a-4ab408901767	2eefc0ca-3cfa-4f9d-bff0-7d91b636f3f1
2cbedcca-9888-4dc2-9d42-1337b60a8a96	699bd21f-ae84-49c0-bb7a-4ab408901767	fc550f94-bd91-4088-a1b8-61b5fac84e7f
4f3bc84c-89fc-4289-9df7-6b1923452e97	699bd21f-ae84-49c0-bb7a-4ab408901767	60e4f48b-e332-4f06-8a49-ec7f19d2fef8
5bfaa257-336a-4df4-b7d7-a510bfad5240	699bd21f-ae84-49c0-bb7a-4ab408901767	d3b047b3-79fc-467a-94e6-d0e3612d72ce
d8312e79-b88b-43b9-b996-fe9b78d72d47	699bd21f-ae84-49c0-bb7a-4ab408901767	aceb3952-3da9-4d58-aa99-7eedb10ec926
f50c6a8b-9347-483b-9012-172b9645c97e	699bd21f-ae84-49c0-bb7a-4ab408901767	8c7189e3-1083-4919-a5d4-0d583a8bac3d
6e3319c2-0f3a-4371-bab1-dfb31bd9c755	699bd21f-ae84-49c0-bb7a-4ab408901767	3596a211-7ff0-4140-9e95-9e13d82b2f21
90af506e-9a12-4087-a140-a5b040f162b0	699bd21f-ae84-49c0-bb7a-4ab408901767	df7c6e11-e331-488e-a637-0d3568c7d09d
3d250fa0-9143-4755-8a3a-d19b215373f5	699bd21f-ae84-49c0-bb7a-4ab408901767	16858dc3-b6f5-4954-a662-f605abf91a0d
6fab9bdc-5023-4357-b3ca-75a39e80100c	699bd21f-ae84-49c0-bb7a-4ab408901767	0fffc0bc-d985-40e8-bbf3-d401ee4e79ba
c7bbbd00-7cc7-4d77-9865-4e67416ea0c9	699bd21f-ae84-49c0-bb7a-4ab408901767	589ce806-8d80-432d-bfde-e7b759e9b8c2
917b43d6-7c56-4d49-aa07-ea7874026b41	699bd21f-ae84-49c0-bb7a-4ab408901767	5fa399f1-c842-4a22-89d1-781ea55c0ea1
da44908d-3045-4c7a-a0d0-0ed9e468d91c	699bd21f-ae84-49c0-bb7a-4ab408901767	5434e722-00cd-4a62-bdfe-ab6449c7bec3
3bb38f1c-b2d3-46b7-9adf-af11d53f69af	699bd21f-ae84-49c0-bb7a-4ab408901767	5f627b1e-b6d1-470b-ade2-221fa7c22fae
0ee70014-6254-44ba-a31e-d35af95ca8de	699bd21f-ae84-49c0-bb7a-4ab408901767	9c306452-fe67-4de4-9f4b-dbeb9c71b5f4
91f9cd03-d8cb-4f7c-a715-af550f1fe7d0	699bd21f-ae84-49c0-bb7a-4ab408901767	fa36a319-79ac-40c6-9537-78a043733d0a
f38a041b-27eb-4394-ae51-11c89518dbe8	699bd21f-ae84-49c0-bb7a-4ab408901767	b652c003-9d0f-4ed2-99f9-433a3c4fe6f2
80e68407-9287-49fe-bd20-84e55b39fffa	699bd21f-ae84-49c0-bb7a-4ab408901767	0ea0b34a-b2ad-4083-94e0-fee8deeb547a
c58b0ae4-b664-42b3-9406-cc23996de225	699bd21f-ae84-49c0-bb7a-4ab408901767	c8917a05-ab0a-449b-acb1-96e311f7dbe8
\.


--
-- Data for Name: storage_config; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.storage_config (key, value, updated_at) FROM stdin;
contractPath	contract	2026-06-06 17:17:14.328
insurancePath	insurance	2026-06-06 17:17:14.328
namingRule	{contractNo}{name}{partyB}	2026-06-06 17:17:14.328
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.suppliers (id, name, code, contact, phone, email, address, category, status, remark, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: task_change_logs; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.task_change_logs (id, project_id, task_id, user_id, action, field_name, "oldValue", "newValue", created_at) FROM stdin;
733b5278-194d-4f5e-a8e8-9735ef2ec0cd	a8676196-de2d-47ec-b6f3-940376485611	c7d0d7bc-23ed-4ae2-9aa3-4049bd8e773b	2d2dc4c4-6cf4-426c-9032-e055447815c8	created	\N	\N	POB提交	2026-06-27 01:38:12.578
ac379902-77ac-4750-b44e-c22822e38b10	a8676196-de2d-47ec-b6f3-940376485611	7c8cc935-525a-4307-b1c6-61e809c7654a	2d2dc4c4-6cf4-426c-9032-e055447815c8	created	\N	\N	HOE采购预算提交	2026-06-27 01:39:33.48
\.


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.task_comments (id, task_id, user_id, content, mentions, created_at) FROM stdin;
\.


--
-- Data for Name: task_dependencies; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.task_dependencies (id, task_id, depends_on_task_id) FROM stdin;
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, start_date, due_date, completed_at, sort_order, created_at, updated_at, progress, relative_to_target, start_offset_days, due_offset_days) FROM stdin;
c7d0d7bc-23ed-4ae2-9aa3-4049bd8e773b	a8676196-de2d-47ec-b6f3-940376485611	\N	POB提交	编制筹备期预算	todo	medium	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-24 00:00:00	2026-06-26 00:00:00	\N	1	2026-06-27 01:38:12.559	2026-06-27 01:38:12.559	0	f	0	0
7c8cc935-525a-4307-b1c6-61e809c7654a	a8676196-de2d-47ec-b6f3-940376485611	\N	HOE采购预算提交		todo	medium	2d2dc4c4-6cf4-426c-9032-e055447815c8	2026-06-01 00:00:00	2026-06-05 00:00:00	\N	2	2026-06-27 01:39:33.475	2026-06-27 01:39:33.475	0	f	0	0
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.uploads (id, contract_id, filename, original_name, size, mime_type, uploaded_at) FROM stdin;
e2366175-2f27-46c9-b951-26dc38e6c3fe	0d03081a-c7e3-40ea-afeb-0c8b9220ed70	contract/测试审批流程测试供应商.txt	test-approval.txt	19	text/plain	2026-06-13 04:35:42.337
edc530d5-8e42-4839-a04c-bea34b3c7c6e	01e4657e-04b3-4d7d-aa3f-4b78a77305c5	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-13 04:37:18.667
5f4a42c1-cea3-43e8-82f5-ae2bc494dd0a	ffe05ebc-9ed8-4fe5-a2c8-52e21d749344	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-13 04:43:21.319
fd36e459-89ad-4e8e-b76c-35d31c44934e	1c138f6b-2778-48f2-b357-a00ca672bf79	contract/深圳美高梅酒店精品店泳衣泳具代销合同-三亚辰檬贸易有限公司待提取.doc	深圳美高梅酒店精品店泳衣泳具代销合同-三亚辰檬贸易有限公司.doc	75776	application/msword	2026-06-26 17:37:50.089
3464648f-bd58-49ac-95ea-9ce326ca6aa5	\N	contract/附件1、深圳市富采贸易有限公司檀都威士忌推广补充协议 - 最终版待提取.doc	附件1、深圳市富采贸易有限公司檀都威士忌推广补充协议 - 最终版.doc	52224	application/msword	2026-06-26 17:11:30.338
1239be35-0444-45b2-acdf-0abe742add54	\N	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-26 17:14:04.362
265a78a3-1387-4c49-99fe-8f58f3fca692	\N	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-26 17:26:23.261
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_roles (id, user_id, role_id) FROM stdin;
972d790a-4375-4ba4-aead-ef33c852f3cd	9b768321-9f6d-41cf-a761-a1df265c4a06	6329910b-11b1-42d3-97d2-581782bdb0ee
dcb6c0c2-9470-48e7-8224-c9e060bee8a1	9b768321-9f6d-41cf-a761-a1df265c4a06	13a272a9-5be3-439a-af1b-02b6b0128c0c
922c2d33-f3e2-49ce-8082-b1ff6cf7581c	9b768321-9f6d-41cf-a761-a1df265c4a06	6e8248a9-0f71-4145-9462-799645524828
ef03c70e-e535-4ede-9577-ee13db3c5c64	875447ab-4bb5-4cbb-b225-0d56ccb35a1c	13a272a9-5be3-439a-af1b-02b6b0128c0c
585489e6-2ba3-483e-b75c-d6c9b8fc8ef0	2d2dc4c4-6cf4-426c-9032-e055447815c8	6e8248a9-0f71-4145-9462-799645524828
a0b9dfbb-881d-4c51-be47-69b066d9ea4b	7095ccb5-1a06-488e-a275-d26489367bc2	a9e9c381-03d7-4c0c-a767-ca317a55a55c
14ea0705-1732-4dda-a635-b865564a4b78	600189e4-7476-4e86-bf57-dd1c4bdac059	699bd21f-ae84-49c0-bb7a-4ab408901767
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, username, password_hash, name, email, department, department_code, role, avatar, is_active, created_at) FROM stdin;
875447ab-4bb5-4cbb-b225-0d56ccb35a1c	May	$2a$10$b/JEdOPmM7C7KMVp3Tg6rOyAwyJR4NmGwYeCiFGzQXZYJ6zmwGOqO	姜美慧		前厅部	01001	clerk	\N	t	2026-06-06 17:38:34.224
2d2dc4c4-6cf4-426c-9032-e055447815c8	admin	$2a$10$5ag14gsON71k..i6pmwGxu9FeOYer.gLOcle9LtjASQvvvJRCRJqe	管理员	admin@example.com	管理部	MGMT	super_admin	\N	t	2026-06-06 17:17:14.315
9b768321-9f6d-41cf-a761-a1df265c4a06	Hadwin	$2a$10$opyGwAfEy8dqqHzKjT6Gl.tmj5HloSHb9e1ZORQr1dagV9UeGwp7y	黄守兵	hsb8156@hotmail.com	财务部	04100	clerk	\N	t	2026-06-13 05:25:29.6
7095ccb5-1a06-488e-a275-d26489367bc2	Frank	$2a$10$CPl9MLG3HxPFVjyfwa6eAeHbMoY28ox8ThRNSlQ81jH/pQVMSFMqS	李光鹏	frank.li@mgm.com	行政办	04200	clerk	\N	t	2026-06-26 17:50:17.948
600189e4-7476-4e86-bf57-dd1c4bdac059	Luo	$2a$10$iHK3Y90itPcG4unjgbEUx.XgKEx1DFX5fQHC9svHWAIDV7DH5Ua/6	罗总	\N	行政办	04200	clerk	\N	t	2026-06-26 17:50:47.255
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ai_config ai_config_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.ai_config
    ADD CONSTRAINT ai_config_pkey PRIMARY KEY (key);


--
-- Name: approval_flow_steps approval_flow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_flow_steps
    ADD CONSTRAINT approval_flow_steps_pkey PRIMARY KEY (id);


--
-- Name: approval_flows approval_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_flows
    ADD CONSTRAINT approval_flows_pkey PRIMARY KEY (id);


--
-- Name: approval_records approval_records_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_records
    ADD CONSTRAINT approval_records_pkey PRIMARY KEY (id);


--
-- Name: audit_records audit_records_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_pkey PRIMARY KEY (id);


--
-- Name: audit_templates audit_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: custom_roles custom_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: procurement_requests procurement_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_pkey PRIMARY KEY (id);


--
-- Name: progress_updates progress_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.progress_updates
    ADD CONSTRAINT progress_updates_pkey PRIMARY KEY (id);


--
-- Name: project_files project_files_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: storage_config storage_config_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.storage_config
    ADD CONSTRAINT storage_config_pkey PRIMARY KEY (key);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: task_change_logs task_change_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_change_logs
    ADD CONSTRAINT task_change_logs_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_dependencies task_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: uploads uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: audit_templates_contract_type_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX audit_templates_contract_type_key ON public.audit_templates USING btree (contract_type);


--
-- Name: custom_roles_name_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX custom_roles_name_key ON public.custom_roles USING btree (name);


--
-- Name: departments_code_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX departments_code_key ON public.departments USING btree (code);


--
-- Name: notification_preferences_user_id_type_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX notification_preferences_user_id_type_key ON public.notification_preferences USING btree (user_id, type);


--
-- Name: permissions_module_action_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX permissions_module_action_key ON public.permissions USING btree (module, action);


--
-- Name: project_files_project_id_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX project_files_project_id_idx ON public.project_files USING btree (project_id);


--
-- Name: project_members_project_id_user_id_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX project_members_project_id_user_id_key ON public.project_members USING btree (project_id, user_id);


--
-- Name: projects_owner_id_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX projects_owner_id_idx ON public.projects USING btree (owner_id);


--
-- Name: projects_target_date_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX projects_target_date_idx ON public.projects USING btree (target_date);


--
-- Name: purchase_orders_order_no_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX purchase_orders_order_no_key ON public.purchase_orders USING btree (order_no);


--
-- Name: role_permissions_role_id_permission_id_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX role_permissions_role_id_permission_id_key ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: suppliers_code_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX suppliers_code_key ON public.suppliers USING btree (code);


--
-- Name: task_dependencies_task_id_depends_on_task_id_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX task_dependencies_task_id_depends_on_task_id_key ON public.task_dependencies USING btree (task_id, depends_on_task_id);


--
-- Name: tasks_project_due_date_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX tasks_project_due_date_idx ON public.tasks USING btree (project_id, due_date);


--
-- Name: user_roles_user_id_role_id_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX user_roles_user_id_role_id_key ON public.user_roles USING btree (user_id, role_id);


--
-- Name: users_username_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);


--
-- Name: approval_flow_steps approval_flow_steps_flow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_flow_steps
    ADD CONSTRAINT approval_flow_steps_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.approval_flows(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: approval_records approval_records_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_records
    ADD CONSTRAINT approval_records_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: audit_records audit_records_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_records audit_records_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_records
    ADD CONSTRAINT audit_records_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_templates audit_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: contracts contracts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: procurement_requests procurement_requests_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: procurement_requests procurement_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: procurement_requests procurement_requests_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.procurement_requests
    ADD CONSTRAINT procurement_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: progress_updates progress_updates_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.progress_updates
    ADD CONSTRAINT progress_updates_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: progress_updates progress_updates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.progress_updates
    ADD CONSTRAINT progress_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: project_files project_files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_files project_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: projects projects_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reminders reminders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.custom_roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_change_logs task_change_logs_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_change_logs
    ADD CONSTRAINT task_change_logs_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_change_logs task_change_logs_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_change_logs
    ADD CONSTRAINT task_change_logs_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_change_logs task_change_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_change_logs
    ADD CONSTRAINT task_change_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: task_dependencies task_dependencies_depends_on_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_depends_on_task_id_fkey FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: task_dependencies task_dependencies_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.task_dependencies
    ADD CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.tasks(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: uploads uploads_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.uploads
    ADD CONSTRAINT uploads_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.custom_roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 4h2zWfDLEsqt0gBIgyUQeByfElA0j6eB5FDtq8uiVlweehXrzF8tj9NaKotfqJb

