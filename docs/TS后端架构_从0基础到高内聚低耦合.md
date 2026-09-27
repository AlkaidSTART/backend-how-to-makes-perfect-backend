# TS 后端架构：从 0 基础到高内聚低耦合

> 目标：从最基础的 HTTP 接口开始，逐步理解 TypeScript 后端的分层、模块化、依赖注入、依赖倒置，以及高内聚、低耦合的工程化架构。

---

## 1. 学习目标

学完以后，应该能够独立设计类似：

```text
React / Vue
     ↓
HTTP API
     ↓
Controller
     ↓
Service / Use Case
     ↓
Repository
     ↓
Database
```

并理解：

- 为什么要分 Controller / Service / Repository
- 什么代码应该放在哪里
- 什么叫高内聚
- 什么叫低耦合
- 为什么 Controller 不应该直接操作数据库
- 为什么 Service 不应该强依赖具体 ORM
- DTO、Entity、Model 分别是什么
- 如何处理参数校验和异常
- 如何使用依赖注入
- 如何通过接口降低模块耦合
- 如何从简单 CRUD 演进到可维护的后端架构

---

# 2. 第一阶段：理解后端

不要一开始就学框架，先理解后端的基本工作方式。

```text
客户端
  ↓
HTTP Request
  ↓
后端服务器
  ↓
业务处理
  ↓
数据库
  ↓
HTTP Response
  ↓
客户端（收到响应）
```

例如：

```http
POST /users
Content-Type: application/json

{
  "name": "Alkaid",
  "email": "test@example.com"
}
```

后端完成业务处理后返回：

```json
{
  "id": "123",
  "name": "Alkaid",
  "email": "test@example.com"
}
```

---

# 3. 第二阶段：HTTP API 基础

## 3.1 HTTP 方法

```text
GET       查询
POST      创建
PUT       整体更新
PATCH     部分更新
DELETE    删除
```

例如：

```http
GET /users
GET /users/123

POST /users

PATCH /users/123

DELETE /users/123
```

---

## 3.2 Request

HTTP 请求主要可以理解为：

```text
Request
├── Params
├── Query
├── Body
├── Headers
└── Cookies
```

例如：

```http
GET /users/123?page=1
Authorization: Bearer xxx
```

对应：

```ts
params.id
query.page
headers.authorization
```

POST Body：

```json
{
  "name": "Alkaid",
  "age": 20
}
```

对应：

```ts
body.name
body.age
```

---

## 3.3 Response

常见状态码：

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
500 Internal Server Error
```

需要建立一个重要认知：

> HTTP 状态码属于协议层，业务错误属于业务层。

例如：

```text
用户不存在
→ 404 Not Found

邮箱已经注册
→ 409 Conflict
```

---

# 4. 第三阶段：Node.js + TypeScript

开始使用 TypeScript 编写后端。

推荐学习路线：

```text
Node.js
  +
TypeScript
  +
NestJS
```

NestJS 很适合作为架构学习载体，因为它天然包含：

- Module
- Controller
- Service
- Dependency Injection
- Middleware
- Guard
- Interceptor
- Pipe

这些概念与工程化后端高度相关。

---

# 5. 第四阶段：Controller / Service / Repository

## 5.1 最简单的 API

刚开始甚至可以直接：

```ts
app.get("/users", async () => {
  return [
    {
      id: 1,
      name: "Alkaid",
    },
  ];
});
```

这时候没有明显架构。

没关系。

> 架构应该随着复杂度演进，而不是一开始堆满概念。

---

# 6. Controller

Controller 的职责：

> 负责 HTTP 层。

例如：

```ts
class UserController {
  async getUser(req, res) {
    const user = await this.userService.getUser(req.params.id);

    return res.json(user);
  }
}
```

Controller 主要负责：

```text
HTTP Request
      ↓
获取参数
      ↓
调用业务
      ↓
HTTP Response
```

Controller 不应该承担复杂业务逻辑。

不推荐：

```ts
async getUser(req, res) {
  const user = await db.user.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  if (user.status === "banned") {
    throw new Error("用户被封禁");
  }

  // 一堆业务逻辑……
}
```

问题：

- Controller 太胖
- HTTP 与业务耦合
- 数据库与 Controller 耦合
- 难以测试
- 难以复用业务逻辑

---

# 7. Service

Service 的职责：

> 负责业务逻辑。

例如：

```ts
class UserService {
  async getUser(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }
}
```

Service 应该关注：

```text
业务应该怎么运行
```

而不是：

```text
HTTP 怎么处理
NestJS Controller 怎么写
req / res 怎么操作
```

---

# 8. Repository

Repository 的职责：

> 负责数据访问。

例如：

```ts
class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }
}
```

Repository 负责：

```text
数据库查询
数据库新增
数据库修改
数据库删除
```

于是形成：

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

---

# 9. 为什么要分层？

因为每一层都有明确职责：

```text
Controller
→ HTTP

Service
→ Business

Repository
→ Data Access
```

这体现的是：

> 单一职责原则（Single Responsibility Principle）

一个模块应该主要负责一个明确的变化原因。

---

# 10. 第五阶段：DTO

DTO：

> Data Transfer Object

用于描述 API 的输入或输出数据。

例如：

```ts
class CreateUserDto {
  name: string;
  email: string;
  password: string;
}
```

表示：

> 创建用户这个 API 允许客户端传入什么。

例如：

```json
{
  "name": "Alkaid",
  "email": "test@example.com",
  "password": "123456"
}
```

---

# 11. DTO ≠ Entity ≠ Database Model

这是后端学习中的重要概念。

## DTO

描述：

> API 输入 / 输出

例如：

```text
CreateUserDto
UpdateUserDto
LoginDto
```

---

## Entity

描述：

> 业务领域中的对象。

例如：

```text
User
Order
Product
Payment
```

---

## Database Model

描述：

> 数据库中的数据结构。

例如 Prisma：

```prisma
model User {
  id       String
  email    String
  password String
}
```

三者不应该无脑混为一谈。

---

# 12. 参数校验

API 输入不能完全信任客户端。

例如：

```text
email
```

需要验证：

```text
是否存在
是否是字符串
是否符合邮箱格式
长度是否合理
```

常见方案：

```text
Zod
class-validator
Valibot
```

现代 TypeScript 项目可以考虑 Zod：

```ts
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  password: z.string().min(6),
});
```

核心思想：

> API 边界必须进行输入验证。

---

# 13. 第六阶段：错误处理

不要在项目中到处：

```ts
throw new Error("xxx");
```

可以逐渐形成明确的错误类型。

例如：

```ts
class UserNotFoundError extends Error {}
```

业务层：

```ts
if (!user) {
  throw new UserNotFoundError();
}
```

然后通过统一异常处理：

```text
Service
 ↓
throw Error
 ↓
Global Exception Handler
 ↓
HTTP Response
```

而不是每个 Controller 都自己：

```ts
try {
  ...
} catch (error) {
  return res.status(500).json(...)
}
```

---

# 14. 统一响应

可以设计统一的 API 响应结构：

成功：

```json
{
  "success": true,
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

但不要为了统一而统一。

> API 设计应该优先保证清晰、稳定、易用。

---

# 15. 第七阶段：模块化

当项目开始变大：

```text
src/
├── users/
├── auth/
├── posts/
├── comments/
└── payments/
```

而不是：

```text
controllers/
services/
repositories/
```

里面塞几十个甚至上百个文件。

更推荐按照业务领域组织：

```text
users/
├── user.controller.ts
├── user.service.ts
├── user.repository.ts
├── user.dto.ts
└── user.entity.ts

auth/
├── auth.controller.ts
├── auth.service.ts
└── auth.dto.ts
```

这是一种：

> 按业务领域组织代码（Feature / Domain-oriented Organization）

---

# 16. 什么叫高内聚？

高内聚：

> 一个模块内部的代码应该尽可能围绕同一个业务职责。

例如：

```text
users/
├── user.controller.ts
├── user.service.ts
├── user.repository.ts
├── user.dto.ts
└── user.entity.ts
```

这些代码都围绕：

```text
User
```

因此具有较高的内聚性。

---

# 17. 什么叫低耦合？

耦合描述：

> 一个模块对另一个模块的依赖程度。

例如：

```ts
class UserService {
  constructor(
    private prisma: PrismaClient,
  ) {}
}
```

这里：

```text
UserService
     ↓
Prisma
```

Service 强依赖 Prisma。

如果以后：

```text
Prisma
 ↓
Drizzle
```

可能需要修改大量业务代码。

---

# 18. 依赖抽象

更好的方式：

```text
UserService
     ↓
UserRepository
     ↓
PrismaUserRepository
```

Service 只依赖抽象：

```ts
interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

具体实现：

```ts
class PrismaUserRepository implements UserRepository {
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
```

Service 不需要知道：

```text
Prisma
PostgreSQL
MySQL
MongoDB
```

它只知道：

```text
UserRepository
```

这就是降低耦合的核心手段之一。

---

# 19. 高内聚，低耦合的场景与判断

这个问题其实比"什么是高内聚、低耦合"更重要。

你真正需要掌握的不是：

> "我要不要使用高内聚低耦合？"

而是：

> **"什么时候代码的变化开始互相影响，我需要开始拆分？"**

因为**高内聚、低耦合不是一种架构，而是一种判断标准。**

## 19.1 一句话判断法

你以后写 TS 后端时，可以先问自己两个问题：

**问题 1：这些代码是不是因为同一个原因而变化？**

- 如果是：放在一起 → 高内聚
- 如果不是：考虑拆开

**问题 2：A 修改的时候，是否经常必须修改 B？**

- 如果是：耦合过高 → 考虑降低耦合
- 如果不是：没必要为了"低耦合"强行抽象

## 19.2 判断模型

```text
                代码变化
                   │
          ┌────────┴────────┐
          ↓                 ↓
     是否一起变化？     是否互相影响？
          │                 │
         是                是
          ↓                 ↓
       高内聚            耦合过高
          │                 │
       放一起             考虑拆分
```

所以：

> **高内聚解决"东西应该放在哪里"。**
>
> **低耦合解决"东西之间应该怎么依赖"。**

这个区别非常重要。

## 19.3 场景 1：刚开始写 CRUD

比如你现在做 `User`，只有创建用户、查询用户、修改用户、删除用户，你完全可以：

```text
users/
├── user.controller.ts
├── user.service.ts
└── user.repository.ts
```

这已经够了。没必要一开始就：

```text
users/
├── domain/
├── application/
├── infrastructure/
├── presentation/
├── ports/
├── adapters/
└── value-objects/
```

这种属于**架构过度设计**。

## 19.4 什么时候开始需要高内聚？

假设你的项目慢慢变成：

```text
用户
├── 注册
├── 登录
├── 修改资料
├── 修改密码
├── 上传头像
├── 收藏
├── 关注
└── VIP
```

然后你发现 `user.service.ts` 已经 800 行，里面同时出现：

```ts
register()
login()
updateProfile()
changePassword()
uploadAvatar()
addFavorite()
followUser()
checkVip()
```

这时候你应该开始问：

> **这些东西真的都属于同一个职责吗？**

可能就应该拆成：

```text
users/
├── application/
│   ├── register-user.ts
│   ├── update-profile.ts
│   ├── change-password.ts
│   └── follow-user.ts
│
├── domain/
│   └── user.ts
│
└── infrastructure/
    └── user.repository.ts
```

为什么？因为注册、修改密码、关注、VIP 虽然都和 User 有关，但它们的**变化原因可能不同**。这就是高内聚的实际应用。

## 19.5 一个特别好用的判断方法：看"变化原因"

比如 `UserService` 里面：

```ts
register()
login()
sendEmail()
uploadAvatar()
createOrder()
```

你就依次问自己：

> 如果登录规则变了，我是不是需要改 `UserService`？
> 如果邮件服务变了，我是不是也要改 `UserService`？
> 如果订单系统变了，我是不是还得改 `UserService`？

如果答案都是"是"，那这个 Service 大概率已经**职责过多、内聚性下降**。

## 19.6 低耦合什么时候开始重要？

最典型的场景是数据库。

项目小的时候，这样完全可以，不要看到 Prisma 就开始抽象：

```ts
class UserService {
  constructor(
    private prisma: PrismaClient
  ) {}
}
```

但是如果出现 `UserService`、`OrderService`、`PaymentService`、`ProductService` 全部直接依赖 Prisma，业务代码到处写：

```ts
prisma.user.find...
prisma.order.find...
prisma.payment.find...
```

这时候你就开始需要考虑：

```text
业务逻辑
    ↓
Repository Interface
    ↓
Prisma Repository
```

## 19.7 什么时候"不需要"低耦合？

这个非常重要。假设项目只有 3 个接口、1 个开发者、没有复杂业务、不会更换 ORM，那么下面这样已经足够：

```ts
class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    });
  }
}
```

你没必要搞：

```ts
interface UserRepositoryPort {}

abstract class AbstractUserRepository {}

class PrismaUserRepositoryAdapter {}

class UserRepositoryFactory {}
```

这纯属给自己增加工作量。

## 19.8 真正的判断标准：变化概率 × 影响范围

推荐用这个思维：

```text
是否需要抽象 = 变化概率 × 影响范围
```

| 东西           | 变化概率 | 影响范围 | 是否值得抽象 |
| ------------ | ---: | ---: | ------ |
| User Service |    低 |    小 | ❌      |
| Prisma 查询    |    中 |    中 | ⚠️     |
| 支付服务         |    高 |    大 | ✅      |
| 邮件服务         |    高 |    中 | ✅      |
| 第三方 AI API   |    高 |    大 | ✅      |
| 核心业务规则       |    高 |    大 | ✅      |

这比"架构书说 Repository 很重要，所以我要 Repository"靠谱得多。

## 19.9 低耦合最典型的场景：第三方服务

例如你现在做 AI 产品，一开始可以直接把调用写在业务代码里面：

```ts
const result = await openai.chat.completions.create(...)
```

项目早期没问题。但是后来：

```text
OpenAI
DeepSeek
Gemini
Claude
本地 Ollama
```

你开始做模型路由。这时候如果业务代码到处是：

```ts
openai.xxx()
deepseek.xxx()
gemini.xxx()
```

就麻烦了。应该变成：

```text
业务
 ↓
LLM Provider Interface
 ↓
┌────────────┬────────────┬────────────┐
OpenAI     DeepSeek     Gemini       Ollama
```

例如：

```ts
interface LLMProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
}

class OpenAIProvider implements LLMProvider {}

class DeepSeekProvider implements LLMProvider {}

class GeminiProvider implements LLMProvider {}
```

业务只知道 `llmProvider.chat()`，不知道具体是哪家模型。这就是**低耦合真正有价值的场景**。

## 19.10 另一个典型场景：支付

例如支付宝、微信支付、Stripe、PayPal。如果你的订单业务直接写：

```ts
stripe.paymentIntents.create(...)
```

以后接微信支付就很痛苦。更合理：

```text
OrderService
     ↓
PaymentService
     ↓
PaymentProvider
     ↓
┌─────────┬─────────┬─────────┐
Stripe   Alipay   WeChat
```

因为支付供应商本身就是**高度可变的东西**，所以这里非常值得降低耦合。

## 19.11 再看一个高内聚案例

假设 `order.service.ts` 同时处理创建订单、取消订单、支付订单、退款、库存、优惠券、物流、邮件通知。

这时候问题就来了：库存规则变化，导致 `OrderService` 也要修改；优惠券规则变化，又改 `OrderService`。最后 `OrderService = 2000 行`。

这就是典型的**低内聚**。可以慢慢演进：

```text
Order
 ├── CreateOrder
 ├── CancelOrder
 └── PayOrder

Inventory
 ├── ReserveStock
 └── ReleaseStock

Coupon
 └── CalculateDiscount

Payment
 └── CreatePayment

Notification
 └── SendOrderNotification
```

## 19.12 但千万不要"为了拆而拆"

比如：

```ts
function validateEmail()
function normalizeEmail()
function checkEmailLength()
function checkEmailFormat()
```

然后拆成：

```text
email/
├── email-validator.ts
├── email-normalizer.ts
├── email-length-checker.ts
└── email-format-checker.ts
```

这就有点过了。如果它们天然属于一个简单概念，一个 `validateEmail()` 就够了。

## 19.13 非常实用的经验法则：5 个信号

你以后写项目，可以用这 5 个信号判断。

**信号 1：一个文件越来越大**

100 行 → 200 行 → 500 行 → 1000 行。开始检查职责。

**信号 2：一个类经常因为不同的事情修改**

支付改一次、订单改一次、库存改一次、邮件改一次，结果 `OrderService` 一直在改。这是**内聚性下降**的信号。

**信号 3：一个模块修改，经常导致其他模块一起修改**

修改 User → Auth 要改 → Order 要改 → Payment 又要改。这是**耦合过高**的信号。

**信号 4：你无法单独测试某个业务**

例如测试 `CreateOrder`，却必须启动 PostgreSQL、Redis、第三方支付、消息队列。这说明业务逻辑和基础设施耦合比较严重，可以考虑抽象。

**信号 5：你开始出现大量 `if provider === xxx`**

```ts
if (provider === "openai") {
  ...
}

if (provider === "deepseek") {
  ...
}

if (provider === "gemini") {
  ...
}
```

而且越来越多：OpenAI、DeepSeek、Gemini、Claude、Ollama…… 这就是非常典型的**变化点没有被隔离**。这时候接口 + 策略 / Provider 抽象就很有价值。

## 19.14 最终决策树

以后写代码的时候脑子里过一下：

```text
我现在要写一段代码
       ↓
它属于哪个业务？
       ↓
和这个业务高度相关？
   ┌───┴───┐
   是      否
   ↓        ↓
放在一起   考虑拆分
            ↓
       ┌──────────────┐
       │              │
是否容易变化？    是否会被多个地方依赖？
       │              │
       ↓              ↓
      是             是
       │              │
       └──────┬───────┘
              ↓
         考虑抽象接口
              ↓
          Dependency
           Injection
```

## 19.15 最重要的一句话

你可以把这句话直接记到你的后端学习笔记里：

> **高内聚不是"拆得越细越好"，低耦合也不是"抽象越多越好"。**
>
> **真正的架构能力，是识别代码的变化边界，并把经常一起变化的东西放在一起，把容易独立变化的东西隔离开。**

所以你以后看到一个新需求，不要第一反应"我要不要上 Clean Architecture？"，而是先问：

1. 谁负责这个业务？
2. 哪些代码会因为这个需求一起变化？
3. 哪些代码未来可能独立变化？
4. 这次变化会影响多少地方？
5. 如果现在不抽象，未来修改成本有多大？

**这 5 个问题，比背 DDD、SOLID、Clean Architecture 有用得多。**

---

# 20. 第八阶段：依赖注入 DI

Dependency Injection：

> 不让一个类自己创建依赖，而由外部把依赖传入。

例如：

```ts
class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}
}
```

外部：

```ts
const service = new UserService(
  new PrismaUserRepository(),
);
```

Service 不负责：

```ts
new PrismaUserRepository()
```

而是由外部提供。

这就是：

> Dependency Injection

NestJS 会大量使用这种思想。

---

# 21. 依赖倒置

传统依赖：

```text
Business
   ↓
Prisma
```

更合理：

```text
Business
   ↓
Interface
   ↑
Prisma
```

业务依赖抽象，而不是具体实现。

例如：

```ts
interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

业务：

```ts
class UserService {
  constructor(
    private readonly userRepository: UserRepository,
  ) {}
}
```

基础设施：

```ts
class PrismaUserRepository
  implements UserRepository {
}
```

这样：

```text
业务层
 ↓
抽象
 ↑
基础设施
```

这就是：

> Dependency Inversion Principle

---

# 22. 第九阶段：Use Case

当业务越来越复杂，可以从简单 Service 进一步演进到 Use Case。

一个 Use Case 表示：

> 一个完整的业务动作。

例如：

```text
RegisterUserUseCase
LoginUserUseCase
CreateOrderUseCase
PayOrderUseCase
CancelOrderUseCase
```

例如注册：

```ts
class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: RegisterUserInput) {
    const exists =
      await this.userRepository.findByEmail(input.email);

    if (exists) {
      throw new EmailAlreadyExistsError();
    }

    const password =
      await this.passwordHasher.hash(input.password);

    return this.userRepository.create({
      email: input.email,
      password,
    });
  }
}
```

Use Case 不应该直接依赖：

```text
Prisma
PostgreSQL
bcrypt
Redis
NestJS
HTTP
```

而应该依赖抽象。

---

# 23. 第十阶段：架构演进

成熟项目可以进一步组织成：

```text
src/
│
├── modules/
│   │
│   ├── users/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── repositories/
│   │   │
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   └── dto/
│   │   │
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   │
│   │   └── presentation/
│   │       └── controllers/
│   │
│   └── auth/
│
├── shared/
│   ├── errors/
│   ├── utils/
│   └── types/
│
├── config/
│
└── main.ts
```

这是 Clean Architecture / DDD 等思想可以演进到的方向之一。

但是：

> 不要在刚学后端时直接套这个目录结构。

架构应该根据复杂度演进。

---

# 24. 推荐的架构演进路线

```text
Level 1
单文件 API
        ↓
Level 2
Controller + Service
        ↓
Level 3
Controller + Service + Repository
        ↓
Level 4
Module + DTO + Validation + Error
        ↓
Level 5
Dependency Injection
        ↓
Level 6
Interface + Dependency Inversion
        ↓
Level 7
Use Case + Domain
        ↓
Level 8
Clean Architecture / DDD
```

核心原则：

> 不要为了“高级架构”而架构。

---

# 25. 项目实战路线

## Level 1：Todo API

学习：

```text
HTTP
REST
CRUD
Request
Response
Status Code
```

---

## Level 2：User API

加入：

```text
PostgreSQL
ORM
DTO
Validation
Error Handling
```

---

## Level 3：Blog API

加入：

```text
User
Post
Comment
Auth
JWT
Permission
Module
Service
Repository
```

---

## Level 4：电商 API

加入：

```text
User
Product
Cart
Order
Payment
Inventory
```

进一步学习：

```text
Transaction
Use Case
Repository Interface
Dependency Injection
Domain
```

---

## Level 5：完整全栈项目

最终：

```text
React
   ↓
API
   ↓
NestJS
   ↓
Application
   ↓
Domain
   ↓
Repository
   ↓
PostgreSQL
```

进一步加入：

```text
Redis
Queue
Object Storage
Email
WebSocket
Logging
Monitoring
Testing
Docker
CI/CD
```

---

# 26. 后端架构核心认知

整个架构可以浓缩成一句话：

> 让变化频繁的东西依赖变化稳定的东西，让每个模块只负责自己真正应该负责的事情。

例如：

```text
HTTP
↓
变化快

NestJS
↓
可能更换

Prisma
↓
可能更换

PostgreSQL
↓
相对稳定

业务规则
↓
核心
```

不要让：

```text
业务逻辑
```

被：

```text
HTTP
ORM
Framework
Database
```

绑死。

这就是架构设计的核心之一。

---

# 27. 最终学习地图

```text
                    TS 后端
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
          Web 基础             TypeScript
             │                   │
       HTTP / REST          类型 / 泛型 / 类型体操
             │                   │
             └─────────┬─────────┘
                       ↓
                    Node.js
                       ↓
                    NestJS
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
          Controller          Module
              ↓
           Service
              ↓
         Repository
              ↓
           Database
              │
              ↓
      ┌─────────────────┐
      │ DTO / Validation │
      │ Error Handling   │
      │ Authentication   │
      └─────────────────┘
              ↓
        Dependency Injection
              ↓
           Interface
              ↓
       Dependency Inversion
              ↓
        高内聚 + 低耦合
              ↓
           Use Case
              ↓
            Domain
              ↓
       Clean Architecture
              ↓
      Transaction / Queue
      Cache / Event / Test
              ↓
          工程化后端
```

---

# 28. 学习时的优先级

建议按以下优先级：

### 第一优先级：必须掌握

```text
HTTP
REST API
TypeScript
Node.js
NestJS
Controller
Service
Repository
Module
DTO
Validation
Error Handling
Database
SQL
ORM
```

### 第二优先级：架构能力

```text
Dependency Injection
Interface
Dependency Inversion
Use Case
Domain
高内聚
低耦合
SOLID
```

### 第三优先级：工程化

```text
Authentication
Authorization
Transaction
Cache
Queue
Logging
Testing
Docker
CI/CD
Monitoring
```

### 第四优先级：进阶架构

```text
DDD
Clean Architecture
Hexagonal Architecture
Event-Driven Architecture
Microservices
CQRS
Event Sourcing
```

不要反过来学。

---

# 29. 最终目标

不要把目标定成：

> “我会 NestJS 了。”

而应该达到：

> “我能根据业务复杂度设计合理的 TS 后端架构，并且知道什么时候应该增加抽象、什么时候应该保持简单。”

最终能够做到：

```text
能写 API
   ↓
能写 CRUD
   ↓
能拆 Controller / Service / Repository
   ↓
能做模块化
   ↓
能使用 DI
   ↓
理解接口与依赖倒置
   ↓
理解高内聚低耦合
   ↓
能设计 Use Case
   ↓
能进行架构演进
   ↓
能写可维护的生产级后端
```

> **核心原则：先解决问题，再引入抽象；先保证职责清晰，再追求架构完整。**
