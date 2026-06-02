import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Knockout</CardTitle>
          <CardDescription>Log in met je e-mailadres en wachtwoord</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link href="/forgot-password" className="hover:text-primary">
              Wachtwoord vergeten?
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
