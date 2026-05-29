import { redirect } from 'next/navigation'

/** 申请试用入口：注册与登录共用同一页 */
export default function SignupPage() {
  redirect('/auth/login?mode=signup')
}
