--
-- PostgreSQL database dump
--

\restrict DsEhrDPCtQcTtNc2yjSFi7fQvzReW5NSzlnMRch2pbroEb2VdcH9h0eSu8HT731

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
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
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
    user_id text
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
    updated_at timestamp(3) without time zone NOT NULL
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
    updated_at timestamp(3) without time zone NOT NULL
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

COPY public.approval_records (id, flow_id, step_id, request_id, request_type, approver_id, status, comment, created_at) FROM stdin;
\.


--
-- Data for Name: audit_records; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.audit_records (id, contract_id, risk_score, issues_count, status, analysis, suggestions, summary, template_id, template_version, template_content_snapshot, contract_type, extracted_fields, rule_issues, ai_issues, reviewed_issues, need_human_review_count, audit_version, created_at, reviewed_by) FROM stdin;
0fc35ef1-9097-4184-a4c7-e5db00a7ae37	ffe05ebc-9ed8-4fe5-a2c8-52e21d749344	43	10	fail	> ⚠️ 以下为 AI 合同审核报告，请以有利于深圳美高梅酒店的方向进行修订和谈判\n\n---\n\n**合同名称**：【北京云起风扬商业发展有限公司】清洁剂采购合同\n**合同金额**：人民币 未识别（需结合原文复核）\n**签订方**：甲方：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店 / 乙方：北京云起风扬商业发展有限公司\n**审核日期**：2026年06月13日\n\n---\n\n## 逐条检查结果\n\n本次审核以深圳美高梅酒店利益保护为优先原则。合同整体对甲方保护充分，条款严谨，但存在合同金额未明确、付款条件模糊、附件细节待完善等中等问题，建议补充金额、明确结算方式并完善附件信息。\n共识别 10 个问题，其中严重问题 0 个、中等问题 5 个、轻微问题 5 个。\n付款方式：7.1 本合同无预付款；结算周期：需结合原文复核；税率：13%。\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n暂无。\n\n### 🟡 中等问题（建议修改）\n\n**问题1：合同金额缺失或无效**\n- 所在条款：未明确，需人工定位\n- 原文引用：「未提供原文依据，建议人工复核」\n- 风险分析：未识别到有效合同金额\n- 修改建议：建议改为「建议明确合同金额、币种、税费和付款安排」\n\n**问题2：合同金额未明确**\n- 所在条款：未明确，需人工定位\n- 原文引用：「合同金额：¥0.00万」\n- 风险分析：合同未约定总价或预估总价，可能导致结算时金额争议，且无法有效控制采购预算。\n- 修改建议：建议改为「建议在合同首部或第2条增加预估总金额，如“本合同预估总金额为人民币XX元（含税），最终按实际供货数量结算。”」\n\n**问题3：付款条件模糊，未区分质保金**\n- 所在条款：未明确，需人工定位\n- 原文引用：「全部货物运卸至交货地点...并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的【100 】%。」\n- 风险分析：一次性支付100%结算款，未预留质保金，不利于质量保证期内约束乙方履行保修义务。\n- 修改建议：建议改为「建议修改为“支付至结算总价的95%，剩余5%作为质保金，质保期满后无质量问题30日内无息支付。”」\n\n**问题4：乙方统一社会信用代码缺失**\n- 所在条款：未明确，需人工定位\n- 原文引用：「统一社会信用代码：」\n- 风险分析：缺少乙方统一社会信用代码，影响合同主体识别及后续开票、税务合规。\n- 修改建议：建议改为「要求乙方补充完整统一社会信用代码。」\n\n**问题5：附件3《合同清单》中部分含税单价计算有误**\n- 所在条款：未明确，需人工定位\n- 原文引用：「例如序号1：未税单价126.55，含税单价应为126.55×1.13=143.00，正确；但序号84：未税单价169.03，含税单价应为169.03×1.13=191.00，实际为191，正确。经抽查，多数正确，但建议全面复核。」\n- 风险分析：个别计算错误可能导致结算金额偏差。\n- 修改建议：建议改为「建议双方逐项复核附件3中未税单价与含税单价的换算，确保一致。」\n\n### 🟢 轻微问题\n\n**问题6：合同编号缺失**\n- 所在条款：未明确，需人工定位\n- 原文引用：「未提供原文依据，建议人工复核」\n- 风险分析：未识别到合同编号\n- 修改建议：建议改为「建议补充唯一合同编号，方便归档和追溯」\n\n**问题7：质保金或质量保障安排不明确**\n- 所在条款：未明确，需人工定位\n- 原文引用：「未提供原文依据，建议人工复核」\n- 风险分析：未识别到质保金或质量保障安排\n- 修改建议：建议改为「如适用，建议明确质保金比例、扣留和返还条件」\n\n**问题8：分配器免费租赁协议中“面通知”错别字**\n- 所在条款：未明确，需人工定位\n- 原文引用：「前提条件是必须提前30天面通知对方。」\n- 风险分析：错别字“面”应为“书面”，可能引起通知方式争议。\n- 修改建议：建议改为「修改为“提前30天书面通知对方”。」\n\n**问题9：合同编号未填写**\n- 所在条款：未明确，需人工定位\n- 原文引用：「合同编号：【 】」\n- 风险分析：不利于合同归档和追溯。\n- 修改建议：建议改为「补充唯一合同编号。」\n\n**问题10：甲方通知地址未填写**\n- 所在条款：未明确，需人工定位\n- 原文引用：「甲方指定的邮寄的地址为：」\n- 风险分析：通知地址缺失，可能导致法律文书送达风险。\n- 修改建议：建议改为「补充甲方邮寄地址。」\n\n---\n\n## 亮点条款\n\n1. 第九条/退换货相关条款：保留甲方拒收、退换货或解除合作的权利，有利于深圳美高梅酒店控制商品质量和宾客体验风险。\n2. 价格及发票条款：已出现含税价格、税率或发票要求，有利于后续财务审核和税务合规复核。\n3. 知识产权条款：已关注商标、专利或侵权责任，有利于降低深圳美高梅酒店品牌连带风险。\n4. 保密相关条款：已设置保密或信息保护义务，有利于保护酒店经营信息、宾客信息和品牌资产。\n\n---\n\n## 补充建议\n\n1. **谈判要点**：优先要求对方接受更有利于深圳美高梅酒店的违约责任、解除权、赔偿范围、发票合规和付款条件。\n2. **补充条款建议**：补充对方资质持续有效、商品/服务不影响酒店品牌声誉、因对方原因导致宾客投诉或监管处罚时由对方全额赔偿的条款。\n3. **人工复核建议**：涉及金额、税率、发票类型、销售激励、个人收款、品牌授权和监管合规的问题，应由财务、法务及业务部门共同确认。\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | 未识别 | 合同未明确总价或需按实际结算 |\n| 不含税金额 | 未识别 | ÷(1+税率 13%) |\n| 税额 | 未识别 | ×税率 13% |\n| 验算结果 | -- | ❌ 合同金额缺失或无效 |	["建议在合同中增加“甲方有权根据实际需求调整采购数量，且不构成违约”的条款。","建议明确“结算确认书”的签署流程和时限，避免乙方拖延结算。","建议在附件3中增加“品牌/产地”列，确保货物来源可追溯。","建议将付款方式修改为预留5%质保金，以保障质量保证期内的权益。","建议补充合同预估总金额，便于预算控制和结算核对。"]	好的，根据您提供的合同文件内容和信息，我已为您生成一份详细的文件概况。\n\n---\n\n**合同文件概况**\n\n**1. 合同基本信息摘要**\n\n*   **合同名称：** 深圳美高梅酒店客房清洁剂采购合同\n*   **签订方：**\n    *   甲方（采购方）：深圳市特发小梅沙投资发展有限公司深圳美高梅酒店\n    *   乙方（供应方）：北京云起风扬商业发展有限公司\n*   **合同类型：** 货物采购（含配套设备免费租赁）\n*   **合同金额：** 本合同为框架协议，未约定固定总金额。具体金额根据实际采购数量及附件3《合同清单》中的固定含税单价结算。清单中单品含税单价从约3.67元至1517元不等。\n*   **合同期限：** 供货期限自2026年07月01日起至2027年3月20日止。配套的《分配器免费租赁协议》期限与此一致。\n\n**2. 主要条款概述**\n\n*   **核心标的与交付：** 乙方需按附件3《合同清单》供应清洁剂等货物，并负责运输至甲方指定地点（深圳美高梅酒店），完成安装调试（如需），经甲方验收合格后视为交付。交付前货物损毁、灭失风险由乙方承担。\n*   **付款方式：**\n    *   无预付款。\n    *   全部货物交付、安装调试完成、经甲方验收合格、双方完成结算并签署结算确认书后60日内，甲方向乙方支付至结算总价的100%。\n    *   甲方付款前，乙方必须提供等额合法有效的增值税专用发票，否则甲方有权拒绝付款。\n*   **质量保证：** 质量保证期为一年，自验收合格之日起计算。质保期内，乙方需在接到通知后24小时内到现场提供免费维修或更换服务。\n*   **附件清单：**\n    *   附件1：廉洁合作协议\n    *   附件2：分配器免费租赁协议（含分配器免费使用表清单）\n    *   附件3：货物供应报价清单（即合同清单，共92项产品）\n*   **分配器租赁：** 乙方免费向甲方提供分配器（如清洁剂分配器、洗手皂液分配器等），所有权归乙方，甲方在合同期内拥有免费使用权。合同到期后30日内，甲方需归还设备。\n*   **违约责任：** 合同对乙方违约设定了极为严格的条款。例如，逾期交货每日按该批次货物总额1%支付违约金；货物不合格或违约，甲方有权解除合同，并要求乙方支付该批次货物总额10%-30%的违约金，并赔偿全部直接及间接损失（包括律师费、诉讼费等）。\n*   **争议解决：** 双方协商不成时，任何一方均可向甲方住所地（深圳市盐田区）有管辖权的人民法院提起诉讼。\n\n**3. 关键风险提示**\n\n*   **金额不确定性风险：** 合同未约定总金额，为开口合同。实际采购成本取决于甲方的实际需求，存在预算超支的风险。需人工复核实际采购量是否在预算范围内。\n*   **付款条件苛刻风险：** 付款节点在“结算完成并签署结算确认书后60日”，且以乙方提供合格发票为前提。这意味着乙方需垫付全部货款，资金压力巨大。需人工复核结算流程的时效性，避免因结算延迟导致付款纠纷。\n*   **违约责任不对等风险：** 合同条款明显倾向于保护甲方。乙方违约的罚则（如每日1%的逾期违约金、10%-30%的批次违约金）远高于行业惯例，且甲方有权直接从应付账款中扣除。需人工评估这些条款的合理性与可执行性。\n*   **甲方单方	c590b464-db0e-404d-a8dd-c1ad0d2dd3b7	2	# 采购合同/文件审核规则 - 深圳美高梅酒店专用版\n\n## 审核立场\n- 始终以有利于“深圳美高梅酒店”的方向审核。\n- 对付款、解除权、违约责任、赔偿范围、发票税率、品牌声誉、宾客投诉、监管处罚、信息安全和知识产权进行重点审查。\n- 必须检查合同金额计算、含税/不含税金额、税额、税率、合计数、大小写金额、附件清单金额是否一致。\n- 必须检查错别字、主体名称、日期、编号、附件序号、条款引用、酒店品牌名称是否准确。\n\n## 本类型重点\n- 供应商资质、报价、合同清单、交付验收、付款结算、发票税率、质保/售后、违约责任。\n\n## 输出格式\nAI 审核报告必须严格使用以下格式：\n\n---\n\n**合同名称**：【乙方名称】XXX合同\n**合同金额**：人民币 XX,XXX 元（含税/不含税）\n**签订方**：甲方：深圳美高梅酒店 / 乙方：【对方公司全称】\n**审核日期**：YYYY年MM月DD日\n\n---\n\n## 逐条检查结果\n\n## 问题清单（按严重度排序）\n\n### 🔴 严重问题（必须修改）\n\n**问题1：【简述，一句话】**\n- 所在条款：第X条第Y款\n- 原文引用：「原文内容」\n- 风险分析：具体说明可能导致什么后果\n- 修改建议：建议改为「修改后文本」\n\n### 🟡 中等问题（建议修改）\n\n### 🟢 轻微问题\n\n---\n\n## 亮点条款\n\n---\n\n## 补充建议\n\n---\n\n## 金额验算\n\n| 项目 | 金额 | 验算 |\n|------|------|------|\n| 合同总价（含税） | ¥XX,XXX | -- |\n| 不含税金额 | ¥XX,XXX | ÷(1+税率) |\n| 税额 | ¥XXX | ×税率 |\n| 验算结果 | -- | ✅ 一致 / ❌ 差异¥XX |	采购	{"name":"清洁剂采购合同","partyA":"深圳市特发小梅沙投资发展有限公司深圳美高梅酒店","partyB":"北京云起风扬商业发展有限公司","amount":0,"startDate":"2026-07-01","endDate":"2027-03-20","insuranceInfo":"本合同项下之货物由乙方负责支付从装运地至交货地点并运卸入指定仓库、完成交付前的一切保险费用。","taxRate":13,"contractTerm":"自2026年07月01日起至2027年3月20日止"}	[{"title":"合同编号缺失","severity":"low","source":"rule","evidence":"","reason":"未识别到合同编号","suggestion":"建议补充唯一合同编号，方便归档和追溯","confidence":1,"needHumanReview":false},{"title":"合同金额缺失或无效","severity":"medium","source":"rule","evidence":"","reason":"未识别到有效合同金额","suggestion":"建议明确合同金额、币种、税费和付款安排","confidence":1,"needHumanReview":false},{"title":"质保金或质量保障安排不明确","severity":"low","source":"rule","evidence":"","reason":"未识别到质保金或质量保障安排","suggestion":"如适用，建议明确质保金比例、扣留和返还条件","confidence":1,"needHumanReview":false}]	[{"title":"合同金额未明确","severity":"medium","source":"ai","evidence":"合同金额：¥0.00万","reason":"合同未约定总价或预估总价，可能导致结算时金额争议，且无法有效控制采购预算。","suggestion":"建议在合同首部或第2条增加预估总金额，如“本合同预估总金额为人民币XX元（含税），最终按实际供货数量结算。”","confidence":1,"needHumanReview":false},{"title":"付款条件模糊，未区分质保金","severity":"medium","source":"ai","evidence":"全部货物运卸至交货地点...并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的【100 】%。","reason":"一次性支付100%结算款，未预留质保金，不利于质量保证期内约束乙方履行保修义务。","suggestion":"建议修改为“支付至结算总价的95%，剩余5%作为质保金，质保期满后无质量问题30日内无息支付。”","confidence":1,"needHumanReview":false},{"title":"乙方统一社会信用代码缺失","severity":"medium","source":"ai","evidence":"统一社会信用代码：","reason":"缺少乙方统一社会信用代码，影响合同主体识别及后续开票、税务合规。","suggestion":"要求乙方补充完整统一社会信用代码。","confidence":1,"needHumanReview":false},{"title":"附件3《合同清单》中部分含税单价计算有误","severity":"medium","source":"ai","evidence":"例如序号1：未税单价126.55，含税单价应为126.55×1.13=143.00，正确；但序号84：未税单价169.03，含税单价应为169.03×1.13=191.00，实际为191，正确。经抽查，多数正确，但建议全面复核。","reason":"个别计算错误可能导致结算金额偏差。","suggestion":"建议双方逐项复核附件3中未税单价与含税单价的换算，确保一致。","confidence":0.8,"needHumanReview":true},{"title":"分配器免费租赁协议中“面通知”错别字","severity":"low","source":"ai","evidence":"前提条件是必须提前30天面通知对方。","reason":"错别字“面”应为“书面”，可能引起通知方式争议。","suggestion":"修改为“提前30天书面通知对方”。","confidence":1,"needHumanReview":false},{"title":"合同编号未填写","severity":"low","source":"ai","evidence":"合同编号：【 】","reason":"不利于合同归档和追溯。","suggestion":"补充唯一合同编号。","confidence":1,"needHumanReview":false},{"title":"甲方通知地址未填写","severity":"low","source":"ai","evidence":"甲方指定的邮寄的地址为：","reason":"通知地址缺失，可能导致法律文书送达风险。","suggestion":"补充甲方邮寄地址。","confidence":1,"needHumanReview":false}]	[{"title":"合同编号缺失","severity":"low","source":"rule","evidence":"","reason":"未识别到合同编号","suggestion":"建议补充唯一合同编号，方便归档和追溯","confidence":1,"needHumanReview":false},{"title":"合同金额缺失或无效","severity":"medium","source":"rule","evidence":"","reason":"未识别到有效合同金额","suggestion":"建议明确合同金额、币种、税费和付款安排","confidence":1,"needHumanReview":false},{"title":"质保金或质量保障安排不明确","severity":"low","source":"rule","evidence":"","reason":"未识别到质保金或质量保障安排","suggestion":"如适用，建议明确质保金比例、扣留和返还条件","confidence":1,"needHumanReview":false},{"title":"合同金额未明确","severity":"medium","source":"ai","evidence":"合同金额：¥0.00万","reason":"合同未约定总价或预估总价，可能导致结算时金额争议，且无法有效控制采购预算。","suggestion":"建议在合同首部或第2条增加预估总金额，如“本合同预估总金额为人民币XX元（含税），最终按实际供货数量结算。”","confidence":1,"needHumanReview":false},{"title":"付款条件模糊，未区分质保金","severity":"medium","source":"ai","evidence":"全部货物运卸至交货地点...并经甲方验收合格且结算完成并签署结算确认书后60日内，甲方向乙方支付至结算总价的【100 】%。","reason":"一次性支付100%结算款，未预留质保金，不利于质量保证期内约束乙方履行保修义务。","suggestion":"建议修改为“支付至结算总价的95%，剩余5%作为质保金，质保期满后无质量问题30日内无息支付。”","confidence":1,"needHumanReview":false},{"title":"乙方统一社会信用代码缺失","severity":"medium","source":"ai","evidence":"统一社会信用代码：","reason":"缺少乙方统一社会信用代码，影响合同主体识别及后续开票、税务合规。","suggestion":"要求乙方补充完整统一社会信用代码。","confidence":1,"needHumanReview":false},{"title":"附件3《合同清单》中部分含税单价计算有误","severity":"medium","source":"ai","evidence":"例如序号1：未税单价126.55，含税单价应为126.55×1.13=143.00，正确；但序号84：未税单价169.03，含税单价应为169.03×1.13=191.00，实际为191，正确。经抽查，多数正确，但建议全面复核。","reason":"个别计算错误可能导致结算金额偏差。","suggestion":"建议双方逐项复核附件3中未税单价与含税单价的换算，确保一致。","confidence":0.8,"needHumanReview":true},{"title":"分配器免费租赁协议中“面通知”错别字","severity":"low","source":"ai","evidence":"前提条件是必须提前30天面通知对方。","reason":"错别字“面”应为“书面”，可能引起通知方式争议。","suggestion":"修改为“提前30天书面通知对方”。","confidence":1,"needHumanReview":false},{"title":"合同编号未填写","severity":"low","source":"ai","evidence":"合同编号：【 】","reason":"不利于合同归档和追溯。","suggestion":"补充唯一合同编号。","confidence":1,"needHumanReview":false},{"title":"甲方通知地址未填写","severity":"low","source":"ai","evidence":"甲方指定的邮寄的地址为：","reason":"通知地址缺失，可能导致法律文书送达风险。","suggestion":"补充甲方邮寄地址。","confidence":1,"needHumanReview":false}]	1	structured-v1	2026-06-13 04:43:50.795	\N
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

COPY public.contracts (id, name, party_a, party_b, type, status, amount, amount_excluding_tax, tax_rate, quality_deposit, contract_no, start_date, end_date, contract_term, risk_level, insurance_info, insurance_date, file_path, insurance_file_path, is_audit_draft, follow_dept, cost_dept, cost_code, created_at, user_id) FROM stdin;
01e4657e-04b3-4d7d-aa3f-4b78a77305c5	清洁剂采购合同	深圳市特发小梅沙投资发展有限公司深圳美高梅酒店	北京云起风扬商业发展有限公司	采购	draft	0	0	0			2026-07-01	2027-03-20		low			contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	\N	t				2026-06-13 04:37:18.64	2d2dc4c4-6cf4-426c-9032-e055447815c8
0d03081a-c7e3-40ea-afeb-0c8b9220ed70	测试审批流程	深圳美高梅酒店	测试供应商	采购	pending_approval	0	0	0			2026-01-01	2026-12-31		low			contract/测试审批流程测试供应商.txt	\N	t				2026-06-13 04:35:42.312	2d2dc4c4-6cf4-426c-9032-e055447815c8
ffe05ebc-9ed8-4fe5-a2c8-52e21d749344	清洁剂采购合同	深圳市特发小梅沙投资发展有限公司深圳美高梅酒店	北京云起风扬商业发展有限公司	采购	pending_approval	0	0	0			2026-07-01	2027-03-20		low			contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	\N	t				2026-06-13 04:43:21.287	2d2dc4c4-6cf4-426c-9032-e055447815c8
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
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.project_members (id, project_id, user_id, role) FROM stdin;
2c50d040-d728-456a-b56b-2393134a3966	a8676196-de2d-47ec-b6f3-940376485611	2d2dc4c4-6cf4-426c-9032-e055447815c8	admin
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.projects (id, name, description, status, start_date, end_date, created_at, updated_at) FROM stdin;
a8676196-de2d-47ec-b6f3-940376485611	A酒店筹开项目		active	2026-06-01 00:00:00	2026-06-30 00:00:00	2026-06-06 17:31:40.9	2026-06-06 17:31:40.9
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

COPY public.tasks (id, project_id, parent_id, title, description, status, priority, assignee_id, start_date, due_date, completed_at, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: uploads; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.uploads (id, contract_id, filename, original_name, size, mime_type, uploaded_at) FROM stdin;
e2366175-2f27-46c9-b951-26dc38e6c3fe	0d03081a-c7e3-40ea-afeb-0c8b9220ed70	contract/测试审批流程测试供应商.txt	test-approval.txt	19	text/plain	2026-06-13 04:35:42.337
edc530d5-8e42-4839-a04c-bea34b3c7c6e	01e4657e-04b3-4d7d-aa3f-4b78a77305c5	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-13 04:37:18.667
5f4a42c1-cea3-43e8-82f5-ae2bc494dd0a	ffe05ebc-9ed8-4fe5-a2c8-52e21d749344	contract/深圳美高梅酒店客房清洁剂采购合同待提取.docx	深圳美高梅酒店客房清洁剂采购合同.docx	88954	application/vnd.openxmlformats-officedocument.wordprocessingml.document	2026-06-13 04:43:21.319
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.user_roles (id, user_id, role_id) FROM stdin;
19058ccc-8d96-46de-a49a-2f8797669bd0	2d2dc4c4-6cf4-426c-9032-e055447815c8	a4aa0074-8d7a-4066-9fe5-f412af699038
7eb3d755-f990-46ec-a549-03ada1f7b22c	2d2dc4c4-6cf4-426c-9032-e055447815c8	6329910b-11b1-42d3-97d2-581782bdb0ee
b56f2f57-72fb-4af4-b3c1-f3df7a762435	2d2dc4c4-6cf4-426c-9032-e055447815c8	13a272a9-5be3-439a-af1b-02b6b0128c0c
1f7e1f57-070b-4206-94c2-7d92104a6922	2d2dc4c4-6cf4-426c-9032-e055447815c8	6e8248a9-0f71-4145-9462-799645524828
972d790a-4375-4ba4-aead-ef33c852f3cd	9b768321-9f6d-41cf-a761-a1df265c4a06	6329910b-11b1-42d3-97d2-581782bdb0ee
dcb6c0c2-9470-48e7-8224-c9e060bee8a1	9b768321-9f6d-41cf-a761-a1df265c4a06	13a272a9-5be3-439a-af1b-02b6b0128c0c
922c2d33-f3e2-49ce-8082-b1ff6cf7581c	9b768321-9f6d-41cf-a761-a1df265c4a06	6e8248a9-0f71-4145-9462-799645524828
ef03c70e-e535-4ede-9577-ee13db3c5c64	875447ab-4bb5-4cbb-b225-0d56ccb35a1c	13a272a9-5be3-439a-af1b-02b6b0128c0c
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.users (id, username, password_hash, name, email, department, department_code, role, avatar, is_active, created_at) FROM stdin;
2d2dc4c4-6cf4-426c-9032-e055447815c8	admin	$2a$10$5ag14gsON71k..i6pmwGxu9FeOYer.gLOcle9LtjASQvvvJRCRJqe	管理员	admin@example.com	管理部	MGMT	super_admin	\N	t	2026-06-06 17:17:14.315
9b768321-9f6d-41cf-a761-a1df265c4a06	Hadwin	$2a$10$iTk1K1BVcUvkH9iBZCuC3.Algp68UYVnAeDpAclhNoBdsriLrAEy2	黄守兵	hsb8156@hotmail.com	财务部	04100	clerk	\N	t	2026-06-13 05:25:29.6
875447ab-4bb5-4cbb-b225-0d56ccb35a1c	May	$2a$10$b/JEdOPmM7C7KMVp3Tg6rOyAwyJR4NmGwYeCiFGzQXZYJ6zmwGOqO	姜美慧		前厅部	01001	clerk	\N	t	2026-06-06 17:38:34.224
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
-- Name: project_members_project_id_user_id_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX project_members_project_id_user_id_key ON public.project_members USING btree (project_id, user_id);


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
-- Name: approval_records fk_approval_contract; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_records
    ADD CONSTRAINT fk_approval_contract FOREIGN KEY (request_id) REFERENCES public.contracts(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: approval_records fk_approval_procurement; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.approval_records
    ADD CONSTRAINT fk_approval_procurement FOREIGN KEY (request_id) REFERENCES public.procurement_requests(id) ON UPDATE CASCADE ON DELETE RESTRICT;


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

\unrestrict DsEhrDPCtQcTtNc2yjSFi7fQvzReW5NSzlnMRch2pbroEb2VdcH9h0eSu8HT731

