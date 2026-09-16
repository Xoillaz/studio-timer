# RESTful API 契约

## 通用约定

| 项目 | 说明 |
|------|------|
| 基础路径 | `/api/v1` |
| 认证方式 | Bearer Token（Header: `Authorization: Bearer <token>`） |
| 数据格式 | JSON |
| 时间格式 | ISO 8601（`YYYY-MM-DD HH:mm:ss`） |
| 分页参数 | `page`（默认1）, `page_size`（默认20） |

---

## 一、认证接口

### 1.1 会员登录（假授权）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/auth/login` |
| **角色** | 公开 |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "name": "string (required, max=100)",
    "phone": "string (required, max=20)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "token": "string",
        "member": {
            "id": "integer",
            "name": "string",
            "phone": "string",
            "balance": "decimal"
        }
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误（name/phone为空） |

---

### 1.2 会员注册

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/auth/register` |
| **角色** | 公开 |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "name": "string (required, max=100)",
    "phone": "string (required, max=20)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "member": {
            "id": "integer",
            "name": "string",
            "phone": "string",
            "balance": "decimal"
        }
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 2002 | 用户已存在 |

---

### 1.3 会员充值（模拟）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/auth/recharge` |
| **角色** | 会员 |
| **Header** | `Authorization: Bearer <token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "amount": "decimal (required, min=0.01)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "balance": "decimal"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1008 | 充值金额必须大于0 |
| 2003 | token无效或已过期 |

---

### 1.4 获取当前会员信息

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/auth/me` |
| **角色** | 会员 |
| **Header** | `Authorization: Bearer <token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "integer",
        "name": "string",
        "phone": "string",
        "balance": "decimal",
        "created_at": "datetime"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 2003 | token无效或已过期 |

---

### 1.5 管理员登录

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/auth/login` |
| **角色** | 公开 |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "username": "string (required)",
    "password": "string (required)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "token": "string",
        "admin": {
            "id": "integer",
            "username": "string",
            "real_name": "string",
            "role": "string"
        }
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 2001 | 用户名或密码错误 |

---

## 二、场地管理

### 2.1 获取场地列表

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/venues` |
| **角色** | 公开 |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| is_active | boolean | 否 | 是否启用 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "name": "string",
                "price_per_hour": "decimal",
                "description": "string",
                "is_active": "boolean"
            }
        ],
        "total": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

### 2.2 创建场地

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/venues` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "name": "string (required, max=100)",
    "price_per_hour": "decimal (required, min=0.01)",
    "description": "string (optional, max=500)",
    "is_active": "boolean (default=true)"
}
```

**响应 201：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "integer",
        "name": "string",
        "price_per_hour": "decimal",
        "description": "string",
        "is_active": "boolean",
        "created_at": "datetime"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1005 | 权限不足 |
| 2003 | token无效或已过期 |

---

### 2.3 更新场地

| 项目 | 内容 |
|------|------|
| **方法** | `PUT` |
| **路径** | `/venues/:id` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "name": "string (optional, max=100)",
    "price_per_hour": "decimal (optional, min=0.01)",
    "description": "string (optional, max=500)",
    "is_active": "boolean (optional)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "integer",
        "name": "string",
        "price_per_hour": "decimal",
        "description": "string",
        "is_active": "boolean",
        "updated_at": "datetime"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1005 | 权限不足 |
| 3001 | 场地不存在 |
| 2003 | token无效或已过期 |

---

### 2.4 删除场地

| 项目 | 内容 |
|------|------|
| **方法** | `DELETE` |
| **路径** | `/venues/:id` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": null
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1005 | 权限不足 |
| 3001 | 场地不存在 |
| 2003 | token无效或已过期 |

---

## 三、订单接口

### 3.1 创建订单（选择场地，待入场）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/orders` |
| **角色** | 会员 |
| **Header** | `Authorization: Bearer ***` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "venue_id": "integer (required)"
}
```

**响应 201：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "order_id": "integer",
        "order_no": "string"
    }
}
```

**说明：** 创建订单后状态为 `pending`（待入场），需调用入场接口开始计时。

---

### 3.2 入场（开始计时）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/orders/:id/entry` |
| **角色** | 会员（订单创建者） |
| **Header** | `Authorization: Bearer ***` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "order": {
            "id": "integer",
            "order_no": "string",
            "status": "active",
            "venue_name": "string",
            "entry_time": "datetime",
            "venue_price_per_hour": "decimal"
        }
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1003 | 订单状态不允许此操作（状态必须为 pending） |
| 1004 | 订单不存在 |
| 1005 | 无权操作此订单 |

**说明：** 入场后状态从 `pending` 变为 `active`（进行中）。

---

### 3.3 增值服务

| 项目 | 内容 |
|------|------|
| **方法** | `GET` / `POST` |
| **路径** | `/orders/:id/services` |
| **角色** | 会员（订单创建者） |
| **Header** | `Authorization: Bearer ***` |

**GET 获取增值服务列表：**

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "name": "string",
                "price_per_use": "decimal",
                "quantity": "integer",
                "subtotal": "decimal",
                "created_at": "datetime"
            }
        ],
        "total": "decimal"
    }
}
```

**POST 添加增值服务：**

**请求体：**
```json
{
    "items": [
        {
            "vas_service_id": "integer (required)",
            "quantity": "integer (required, min=1)"
        }
    ]
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "services": [...],
        "total": "decimal"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1003 | 订单状态不允许此操作（状态必须为 active） |

---

### 3.4 离场（结束计时）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/orders/:id/exit` |
| **角色** | 会员（订单创建者） |
| **Header** | `Authorization: Bearer ***` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "order": {
            "id": "integer",
            "order_no": "string",
            "status": "completed",
            "duration_minutes": "integer",
            "base_amount": "decimal",
            "final_amount": "decimal"
        }
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1003 | 订单状态不允许此操作（状态必须为 active） |
| 1004 | 订单不存在 |
| 1005 | 无权操作此订单 |
| 1006 | 余额不足 |

**说明：** 离场后状态从 `active` 直接变为 `completed`（已完成），自动扣除场地费+增值服务费。

---

### 3.5 获取订单详情

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/orders/:id` |
| **角色** | 会员（创建者）/ 管理员 |
| **Header** | `Authorization: Bearer <token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "integer",
        "order_no": "string",
        "status": "string",
        "member": {
            "id": "integer",
            "name": "string",
            "phone": "string"
        },
        "venue": {
            "id": "integer",
            "name": "string",
            "price_per_hour": "decimal"
        },
        "vas_services": [...],
        "entry_time": "datetime",
        "exit_time": "datetime",
        "duration_minutes": "integer",
        "base_amount": "decimal",
        "extra_amount": "decimal",
        "final_amount": "decimal",
        "leader_name": "string",
        "leader_phone": "string",
        "partial_exit_count": "integer",
        "reject_reason": "string",
        "created_at": "datetime",
        "updated_at": "datetime"
    }
}
```

---

### 3.6 获取订单列表

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/orders` |
| **角色** | 会员 / 管理员 |
| **Header** | `Authorization: Bearer <token>` |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 订单状态 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [...],
        "total": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

## 五、管理员审核接口

### 5.1 获取待审核列表

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/admin/orders/pending` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 筛选类型：partial_exit / bill / topup |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "order_no": "string",
                "type": "string",
                "member": {
                    "id": "integer",
                    "name": "string",
                    "phone": "string"
                },
                "venue": {...},
                "entry_time": "datetime",
                "exit_time": "datetime",
                "duration_minutes": "integer",
                "base_amount": "decimal",
                "extra_amount": "decimal",
                "final_amount": "decimal",
                "created_at": "datetime"
            }
        ],
        "total": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

### 5.2 审核部分人离场

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/orders/:id/approve-partial-exit` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "action": "string (required, enum: approve/reject)",
    "remark": "string (optional, max=500)"
}
```

**响应 200（通过）：**
```json
{
    "code": 0,
    "message": "审核通过",
    "data": {
        "id": "integer",
        "status": "entering",
        "message": "已开门放行"
    }
}
```

**响应 200（拒绝）：**
```json
{
    "code": 0,
    "message": "已拒绝",
    "data": {
        "id": "integer",
        "status": "entering",
        "message": "已通知用户"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1003 | 订单状态不允许此操作 |
| 1004 | 订单不存在 |
| 2003 | token无效或已过期 |

---

### 5.3 账单审核（添加额外费用）

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/orders/:id/approve-bill` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "action": "string (required, enum: approve/reject)",
    "extra_amount": "decimal (optional, min=0)",
    "extra_reason": "string (optional, max=500)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "审核通过，已扣款",
    "data": {
        "id": "integer",
        "status": "completed",
        "base_amount": "decimal",
        "extra_amount": "decimal",
        "final_amount": "decimal",
        "message": "已开门放行"
    }
}
```

**错误码：**
| 错误码 | 说明 |
|--------|------|
| 1001 | 参数错误 |
| 1002 | 余额不足 |
| 1003 | 订单状态不允许此操作 |
| 1004 | 订单不存在 |
| 2003 | token无效或已过期 |

---

### 5.4 审核补差价

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/orders/:id/approve-topup` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "action": "string (required, enum: approve/reject)",
    "remark": "string (optional, max=500)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "审核通过",
    "data": {
        "id": "integer",
        "status": "pending_exit",
        "message": "string"
    }
}
```

---

### 5.5 拒单

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/orders/:id/reject` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "reason": "string (required, max=500)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "已拒单",
    "data": {
        "id": "integer",
        "status": "rejected",
        "reject_reason": "string"
    }
}
```

---

### 5.6 手动放行

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/orders/:id/release` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "已放行",
    "data": {
        "id": "integer",
        "status": "completed",
        "message": "模拟开门：哔~"
    }
}
```

---

## 六、日志接口

### 6.1 获取操作日志（会员）

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/logs` |
| **角色** | 会员 |
| **Header** | `Authorization: Bearer <member_token>` |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | integer | 否 | 订单ID |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "order_id": "integer",
                "action": "string",
                "action_name": "string",
                "operator_type": "string",
                "operator_name": "string",
                "details": "object",
                "created_at": "datetime"
            }
        ],
        "total": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

### 6.2 获取所有日志（管理员）

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/admin/logs` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| order_id | integer | 否 | 订单ID |
| action | string | 否 | 动作码 |
| operator_type | string | 否 | 操作人类型 |
| start_date | string | 否 | 开始日期 |
| end_date | string | 否 | 结束日期 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [...],
        "total": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

## 七、通知接口

### 7.1 获取当前用户通知

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/notifications` |
| **角色** | 会员 / 管理员 |
| **Header** | `Authorization: Bearer <token>` |

**查询参数：**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| is_read | boolean | 否 | 是否已读 |
| type | string | 否 | 通知类型 |
| page | integer | 否 | 页码 |
| page_size | integer | 否 | 每页数量 |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "title": "string",
                "content": "string",
                "type": "string",
                "is_read": "boolean",
                "created_at": "datetime"
            }
        ],
        "total": "integer",
        "unread_count": "integer",
        "page": "integer",
        "page_size": "integer"
    }
}
```

---

### 7.2 标记通知为已读

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/notifications/:id/read` |
| **角色** | 会员 / 管理员 |
| **Header** | `Authorization: Bearer <token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": null
}
```

---

## 八、会员管理（管理员）

### 8.1 获取会员列表

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/admin/members` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "items": [
            {
                "id": "integer",
                "name": "string",
                "phone": "string",
                "balance": "decimal",
                "created_at": "datetime"
            }
        ],
        "total": "integer"
    }
}
```

---

### 8.2 查看会员详情

| 项目 | 内容 |
|------|------|
| **方法** | `GET` |
| **路径** | `/admin/members/:id` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "id": "integer",
        "name": "string",
        "phone": "string",
        "balance": "decimal",
        "created_at": "datetime",
        "orders_count": "integer"
    }
}
```

---

### 8.3 手动调整会员余额

| 项目 | 内容 |
|------|------|
| **方法** | `POST` |
| **路径** | `/admin/members/:id/adjust-balance` |
| **角色** | 管理员 |
| **Header** | `Authorization: Bearer <admin_token>` |
| **Content-Type** | `application/json` |

**请求体：**
```json
{
    "amount": "decimal (required)",
    "reason": "string (optional, max=500)"
}
```

**响应 200：**
```json
{
    "code": 0,
    "message": "success",
    "data": {
        "balance": "decimal"
    }
}
```

---

## 附录：错误码总表

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 余额不足 |
| 1003 | 订单状态不允许此操作 |
| 1004 | 订单不存在 |
| 1005 | 权限不足 |
| 1006 | 已有进行中的订单 |
| 1007 | 没有进行中的订单 |
| 1008 | 充值金额必须大于0 |
| 2001 | 用户名或密码错误 |
| 2002 | 用户不存在 |
| 2003 | token无效或已过期 |
| 3001 | 场地不存在 |
| 3002 | 设备不存在 |
| 4001 | 管理员不存在 |
| 4002 | 管理员密码错误 |

---

文档版本：v1.0
更新日期：2026-01-14
