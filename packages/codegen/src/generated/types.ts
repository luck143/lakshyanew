export interface Askquestion {
  id?: string;
  question: string;
  userId?: string;
  status?: string;
}

export interface Blogcategory {
  id?: string;
  name: string;
  slug?: string;
  image?: unknown;
  type?: string;
  status?: string;
}

export interface Blogcomment {
  id?: string;
  name: string;
  email?: string;
  comment: string;
  postId?: string;
  authorId?: string;
  status?: string;
}

export interface Blogpost {
  id?: string;
  title: string;
  slug: string;
  body?: string;
  status?: string;
  tags?: string[];
  authorId?: string;
}

export interface Cart {
  id?: string;
  userId?: string;
  status?: string;
  createdAt?: string;
}

export interface Cartitem {
  id?: string;
  cartId: string;
  productId: string;
  qty?: number;
  price?: number;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  status?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface Contact {
  id?: string;
  ownerId?: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  status?: string;
  notes?: string;
  createdAt?: string;
}

export interface Coupon {
  id?: string;
  code: string;
  description?: string;
  type?: string;
  value?: number;
  minAmount?: number;
  maxUses?: number;
  usedCount?: number;
  status?: string;
  startsAt?: string;
  expiresAt?: string;
}

export interface Currentaffairs {
  id?: string;
  title: string;
  link?: unknown;
  date?: string;
  status?: string;
}

export interface Domain {
  id?: string;
  name: string;
  type?: string;
  scheme?: string;
  status?: string;
  processStatus?: string;
  hidden?: boolean;
  comment?: string;
}

export interface Event {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  reason?: string;
  tags?: string[];
  uid?: string;
  status?: string;
}

export interface Exam {
  id?: string;
  name: string;
  parentId?: string;
  topicId?: string;
  examType?: string[];
  examGroup?: string[];
  seoGroup?: string[];
  status?: string;
  extra?: unknown;
}

export interface Invoice {
  id?: string;
  title: string;
  amount?: number;
  date?: string;
  period?: string;
  type?: string;
  status?: string;
  uid?: string;
  affiliateName?: string;
  payment?: unknown;
  message?: string;
  extra?: unknown;
}

export interface Lead {
  id?: string;
  name: string;
  email?: string;
  stage?: string;
}

export interface Liveclass {
  id?: string;
  title: string;
  description?: string;
  instructor?: string;
  link?: unknown;
  image?: string;
  datetime?: string;
  duration?: number;
  subject?: string;
  topicId?: string;
  series?: string;
  session?: string;
  recordings?: unknown;
  tags?: string[];
  status?: string;
}

export interface Media {
  id?: string;
  name: string;
  url?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  createdAt?: string;
  variants?: string;
}

export interface Mediavariant {
  id?: string;
  mediaId: string;
  format?: string;
  width?: number;
  height?: number;
  path?: string;
  size?: number;
  createdAt?: string;
}

export interface Module {
  id?: string;
  name: string;
  parent?: string;
  subscriptionType?: string;
  resultFormat?: string;
  newStatus?: string;
}

export interface Note {
  id?: string;
  title: string;
  topicId?: string;
  body?: string;
  order?: number;
  status?: string;
}

export interface Notice {
  id?: string;
  message: string;
  type?: string;
  subtype?: string;
  fromid?: string;
  toid?: string;
  totype?: string;
  readtime?: string;
  status?: string;
  extra?: unknown;
}

export interface Order {
  id?: string;
  userId?: string;
  status?: string;
  total?: number;
  currency?: string;
}

export interface Orderitem {
  id?: string;
  orderId?: string;
  productId?: string;
  qty?: number;
  price?: number;
}

export interface Product {
  id?: string;
  title: string;
  slug: string;
  description?: string;
  price?: number;
  status?: string;
  categoryId?: string;
  sku?: string;
  stock?: number;
  cover?: string;
  tags?: string[];
}

export interface Project_note {
  id?: string;
  body?: string;
  title: string;
  status?: string;
  priority?: number;
}

export interface Publisherprofile {
  id?: string;
  name: string;
  companyname?: string;
  email?: string;
  phone?: string;
  website?: unknown;
  address?: string;
  city?: string;
  avatar?: string;
  skype?: string;
  payment?: unknown;
  paymentMethod?: string;
  points?: number;
  verified?: boolean;
}

export interface Publishertoken {
  id?: string;
  name: string;
  token?: string;
  apps?: unknown;
  domains?: unknown;
  ips?: unknown;
  status?: string;
}

export interface Qa_check {
  id?: string;
  name: string;
}

export interface Quiz {
  id?: string;
  topicId: string;
  quesLevel?: string;
  quesLang?: string;
  quesType?: string;
  question: string;
  answer?: unknown;
  correctAns?: string;
  solution?: string;
  marks?: number;
  quesTag?: string[];
  examTag?: string[];
  status?: string;
  likeCount?: number;
  extra?: unknown;
}

export interface Quizcomment {
  id?: string;
  qid: string;
  uid?: string;
  name?: string;
  email?: string;
  comment: string;
  url?: unknown;
  likeCount?: number;
  upvote?: number;
  downvote?: number;
  status?: string;
}

export interface Quizset {
  id?: string;
  name: string;
  topicId?: string;
  topicList?: unknown;
  numQuiz?: number;
  description?: string;
  status?: string;
}

export interface Raiseproblem {
  id?: string;
  issue?: string;
  problem?: string;
  quizId?: string;
  url?: unknown;
  userName?: string;
  userId?: string;
  status?: string;
}

export interface Review {
  id?: string;
  productId: string;
  userId?: string;
  rating?: number;
  title?: string;
  body?: string;
  status?: string;
  createdAt?: string;
}

export interface Review_item {
  id?: string;
  note: string;
}

export interface Role {
  id?: string;
  key: string;
  name: string;
  soms?: unknown;
  status?: string;
}

export interface Setting {
  id?: string;
  key: string;
  value: unknown;
  group?: string;
  label?: string;
  updatedAt?: string;
}

export interface Staff {
  id?: string;
  name: string;
  email?: string;
  title?: string;
  department?: string;
  managerName?: string;
  skype?: string;
  wechat?: string;
  image?: string;
  address?: string;
  payment?: unknown;
  permissions?: unknown;
  comment?: string;
  status?: string;
}

export interface Subscriber {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  gender?: string;
  dob?: string;
  avatar?: string;
  refid?: string;
  verified?: boolean;
  status?: string;
  extra?: unknown;
}

export interface Subscription {
  id?: string;
  userId: string;
  plan: string;
  status?: string;
  amount?: number;
  currency?: string;
  interval?: string;
  currentPeriodEnd?: string;
  canceledAt?: string;
  createdAt?: string;
}

export interface Successstory {
  id?: string;
  name: string;
  author?: string;
  description?: string;
  image?: unknown;
  tags?: string[];
  brand?: string;
  status?: string;
  publishedAt?: string;
}

export interface Task_item {
  id?: string;
  done?: boolean;
  notes?: string;
  title: string;
}

export interface Tenant {
  id?: string;
  name: string;
  domain: string;
  settings?: unknown;
}

export interface Ticket {
  id?: string;
  title: string;
  message: string;
  parent?: string;
  priority?: string;
  status?: string;
  type?: string;
  uid?: string;
  uploads?: unknown;
  affiliateName?: string;
}

export interface Ticket_log {
  id?: string;
  subject: string;
}

export interface Topic {
  id?: string;
  name: string;
  parentId?: string;
  status?: string;
  content?: string;
  sortOrder?: number;
}

export interface User {
  id?: string;
  email: string;
  name?: string;
  role?: string;
  roles?: unknown;
  permissions?: string[];
  status?: string;
}

export interface Videolist {
  id?: string;
  title: string;
  topicId?: string;
  vid?: string;
  ytVid?: string;
  hlsVid?: string;
  mirrors?: unknown;
  content?: string;
  priority?: number;
  length?: number;
  ecomPlan?: unknown;
  tags?: string[];
  status?: string;
}
