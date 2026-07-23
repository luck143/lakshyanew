import { z } from 'zod';
export const askquestionCreateSchema = z.object({
  question: z.string(),
  userId: z.string().optional(),
  status: z.enum(["pending","answered","closed"] as [string, ...string[]]).optional(),
});

export const blogcategoryCreateSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  image: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(["active","hidden"] as [string, ...string[]]).optional(),
});

export const blogcommentCreateSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  comment: z.string(),
  postId: z.string().optional(),
  authorId: z.string().optional(),
  status: z.enum(["pending","approved","spam"] as [string, ...string[]]).optional(),
});

export const blogpostCreateSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1),
  body: z.string().optional(),
  status: z.enum(["draft","published","archived"] as [string, ...string[]]).optional(),
  tags: z.array(z.string()).optional(),
  authorId: z.string().optional(),
});

export const cartCreateSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["active","converted","abandoned"] as [string, ...string[]]).optional(),
  createdAt: z.string().optional(),
});

export const cartitemCreateSchema = z.object({
  cartId: z.string(),
  productId: z.string(),
  qty: z.number().int().optional(),
  price: z.number().optional(),
});

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1),
  status: z.enum(["active","hidden"] as [string, ...string[]]).optional(),
  parentId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const contactCreateSchema = z.object({
  ownerId: z.string().optional(),
  firstName: z.string(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["lead","prospect","customer","churned"] as [string, ...string[]]).optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
});

export const couponCreateSchema = z.object({
  code: z.string(),
  description: z.string().optional(),
  type: z.enum(["percent","fixed"] as [string, ...string[]]).optional(),
  value: z.number().optional(),
  minAmount: z.number().optional(),
  maxUses: z.number().int().optional(),
  usedCount: z.number().int().optional(),
  status: z.enum(["active","inactive","expired"] as [string, ...string[]]).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const currentaffairsCreateSchema = z.object({
  title: z.string().min(1),
  link: z.string().optional(),
  date: z.string().optional(),
  status: z.enum(["active","hidden","draft"] as [string, ...string[]]).optional(),
});

export const domainCreateSchema = z.object({
  name: z.string(),
  type: z.enum(["primary","parked","redirect"] as [string, ...string[]]).optional(),
  scheme: z.enum(["http","https"] as [string, ...string[]]).optional(),
  status: z.enum(["active","inactive"] as [string, ...string[]]).optional(),
  processStatus: z.enum(["live","pending","suspended"] as [string, ...string[]]).optional(),
  hidden: z.boolean().optional(),
  comment: z.string().optional(),
});

export const eventCreateSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  reason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  uid: z.string().optional(),
  status: z.enum(["new","contacted","done","cancelled"] as [string, ...string[]]).optional(),
});

export const examCreateSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional(),
  topicId: z.string().optional(),
  examType: z.array(z.string()).optional(),
  examGroup: z.array(z.string()).optional(),
  seoGroup: z.array(z.string()).optional(),
  status: z.enum(["active","hidden","pending"] as [string, ...string[]]).optional(),
  extra: z.any().optional(),
});

export const invoiceCreateSchema = z.object({
  title: z.string(),
  amount: z.number().optional(),
  date: z.string().optional(),
  period: z.string().optional(),
  type: z.enum(["subscription","commission","refund","other"] as [string, ...string[]]).optional(),
  status: z.enum(["paid","pending","cancelled","overdue"] as [string, ...string[]]).optional(),
  uid: z.string().optional(),
  affiliateName: z.string().optional(),
  payment: z.any().optional(),
  message: z.string().optional(),
  extra: z.any().optional(),
});

export const leadCreateSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  stage: z.enum(["new","won"] as [string, ...string[]]).optional(),
});

export const liveclassCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  instructor: z.string().optional(),
  link: z.string().optional(),
  image: z.string().optional(),
  datetime: z.string().optional(),
  duration: z.number().int().optional(),
  subject: z.string().optional(),
  topicId: z.string().optional(),
  series: z.string().optional(),
  session: z.string().optional(),
  recordings: z.any().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active","hidden","draft"] as [string, ...string[]]).optional(),
});

export const mediaCreateSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().int().optional(),
  path: z.string().optional(),
  createdAt: z.string().optional(),
  variants: z.string().optional(),
});

export const mediavariantCreateSchema = z.object({
  mediaId: z.string(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  path: z.string().optional(),
  size: z.number().int().optional(),
  createdAt: z.string().optional(),
});

export const moduleCreateSchema = z.object({
  name: z.string(),
  parent: z.string().optional(),
  subscriptionType: z.enum(["free","paid","enterprise"] as [string, ...string[]]).optional(),
  resultFormat: z.string().optional(),
  newStatus: z.string().optional(),
});

export const noteCreateSchema = z.object({
  title: z.string().min(1),
  topicId: z.string().optional(),
  body: z.string().optional(),
  order: z.number().int().optional(),
  status: z.enum(["active","hidden","draft"] as [string, ...string[]]).optional(),
});

export const noticeCreateSchema = z.object({
  message: z.string(),
  type: z.enum(["email","sms","push","inapp"] as [string, ...string[]]).optional(),
  subtype: z.string().optional(),
  fromid: z.string().optional(),
  toid: z.string().optional(),
  totype: z.enum(["user","staff","publisher"] as [string, ...string[]]).optional(),
  readtime: z.string().optional(),
  status: z.enum(["sent","delivered","failed","read"] as [string, ...string[]]).optional(),
  extra: z.any().optional(),
});

export const orderCreateSchema = z.object({
  userId: z.string().optional(),
  status: z.enum(["pending","paid","shipped","cancelled"] as [string, ...string[]]).optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
});

export const orderitemCreateSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string().optional(),
  qty: z.number().int().optional(),
  price: z.number().optional(),
});

export const productCreateSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1),
  description: z.string().optional(),
  price: z.number().optional(),
  status: z.enum(["active","hidden","out_of_stock"] as [string, ...string[]]).optional(),
  categoryId: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().int().optional(),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const project_noteCreateSchema = z.object({
  body: z.string().optional(),
  title: z.string(),
  status: z.string().optional(),
  priority: z.number().int().optional(),
});

export const publisherprofileCreateSchema = z.object({
  name: z.string(),
  companyname: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().optional(),
  skype: z.string().optional(),
  payment: z.any().optional(),
  paymentMethod: z.string().optional(),
  points: z.number().int().optional(),
  verified: z.boolean().optional(),
});

export const publishertokenCreateSchema = z.object({
  name: z.string(),
  token: z.string().optional(),
  apps: z.any().optional(),
  domains: z.any().optional(),
  ips: z.any().optional(),
  status: z.enum(["active","inactive"] as [string, ...string[]]).optional(),
});

export const qa_checkCreateSchema = z.object({
  name: z.string(),
});

export const quizCreateSchema = z.object({
  topicId: z.string(),
  quesLevel: z.enum(["easy","medium","hard"] as [string, ...string[]]).optional(),
  quesLang: z.enum(["english","hindi"] as [string, ...string[]]).optional(),
  quesType: z.enum(["mcq","single_answer","one_direction","multiple_correct","paper"] as [string, ...string[]]).optional(),
  question: z.string(),
  answer: z.any().optional(),
  correctAns: z.string().optional(),
  solution: z.string().optional(),
  marks: z.number().int().optional(),
  quesTag: z.array(z.string()).optional(),
  examTag: z.array(z.string()).optional(),
  status: z.enum(["active","pending","inactive","hidden"] as [string, ...string[]]).optional(),
  likeCount: z.number().int().optional(),
  extra: z.any().optional(),
});

export const quizcommentCreateSchema = z.object({
  qid: z.string(),
  uid: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  comment: z.string(),
  url: z.string().optional(),
  likeCount: z.number().int().optional(),
  upvote: z.number().int().optional(),
  downvote: z.number().int().optional(),
  status: z.enum(["active","pending","hidden","spam"] as [string, ...string[]]).optional(),
});

export const quizsetCreateSchema = z.object({
  name: z.string().min(1),
  topicId: z.string().optional(),
  topicList: z.any().optional(),
  numQuiz: z.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(["active","hidden","draft"] as [string, ...string[]]).optional(),
});

export const raiseproblemCreateSchema = z.object({
  issue: z.string().optional(),
  problem: z.string().optional(),
  quizId: z.string().optional(),
  url: z.string().optional(),
  userName: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(["pending","resolved","rejected"] as [string, ...string[]]).optional(),
});

export const reviewCreateSchema = z.object({
  productId: z.string(),
  userId: z.string().optional(),
  rating: z.number().int().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  status: z.enum(["pending","approved","rejected"] as [string, ...string[]]).optional(),
  createdAt: z.string().optional(),
});

export const review_itemCreateSchema = z.object({
  note: z.string(),
});

export const roleCreateSchema = z.object({
  key: z.string().min(1),
  name: z.string(),
  soms: z.any().optional(),
  status: z.enum(["active","inactive"] as [string, ...string[]]).optional(),
});

export const settingCreateSchema = z.object({
  key: z.string(),
  value: z.any(),
  group: z.string().optional(),
  label: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const staffCreateSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  managerName: z.string().optional(),
  skype: z.string().optional(),
  wechat: z.string().optional(),
  image: z.string().optional(),
  address: z.string().optional(),
  payment: z.any().optional(),
  permissions: z.any().optional(),
  comment: z.string().optional(),
  status: z.enum(["active","inactive"] as [string, ...string[]]).optional(),
});

export const subscriberCreateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["m","f","o"] as [string, ...string[]]).optional(),
  dob: z.string().optional(),
  avatar: z.string().optional(),
  refid: z.string().optional(),
  verified: z.boolean().optional(),
  status: z.enum(["active","inactive","blocked"] as [string, ...string[]]).optional(),
  extra: z.any().optional(),
});

export const subscriptionCreateSchema = z.object({
  userId: z.string(),
  plan: z.string(),
  status: z.enum(["trialing","active","past_due","canceled"] as [string, ...string[]]).optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  interval: z.enum(["month","year"] as [string, ...string[]]).optional(),
  currentPeriodEnd: z.string().optional(),
  canceledAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export const successstoryCreateSchema = z.object({
  name: z.string(),
  author: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  tags: z.array(z.string()).optional(),
  brand: z.string().optional(),
  status: z.enum(["active","hidden"] as [string, ...string[]]).optional(),
  publishedAt: z.string().optional(),
});

export const task_itemCreateSchema = z.object({
  done: z.boolean().optional(),
  notes: z.string().optional(),
  title: z.string(),
});

export const tenantCreateSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().min(3),
  settings: z.any().optional(),
});

export const ticketCreateSchema = z.object({
  title: z.string(),
  message: z.string(),
  parent: z.string().optional(),
  priority: z.enum(["low","medium","high","urgent"] as [string, ...string[]]).optional(),
  status: z.enum(["open","pending","resolved","closed"] as [string, ...string[]]).optional(),
  type: z.enum(["general","billing","technical","affiliate"] as [string, ...string[]]).optional(),
  uid: z.string().optional(),
  uploads: z.any().optional(),
  affiliateName: z.string().optional(),
});

export const ticket_logCreateSchema = z.object({
  subject: z.string(),
});

export const topicCreateSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().optional(),
  status: z.enum(["active","hidden","pending"] as [string, ...string[]]).optional(),
  content: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(["network","publisher","user"] as [string, ...string[]]).optional(),
  roles: z.any().optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(["active","inactive","banned"] as [string, ...string[]]).optional(),
});

export const videolistCreateSchema = z.object({
  title: z.string().min(1),
  topicId: z.string().optional(),
  vid: z.string().optional(),
  ytVid: z.string().optional(),
  hlsVid: z.string().optional(),
  mirrors: z.any().optional(),
  content: z.string().optional(),
  priority: z.number().int().optional(),
  length: z.number().int().optional(),
  ecomPlan: z.any().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active","hidden","draft"] as [string, ...string[]]).optional(),
});
