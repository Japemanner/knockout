'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast({ title: 'Ingelogd', description: 'Welkom terug!' })
      router.push('/boards')
      router.refresh()
    } catch (err) {
      toast({
        title: 'Inloggen mislukt',
        description: err instanceof Error ? err.message : 'Onbekende fout',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const NEUTRAL_MAGIC_LINK_MESSAGE = 'Als dit adres bekend is, ontvang je een inloglink.'

  const handleMagicLink = async () => {
    if (!email) {
      toast({ title: 'E-mail verplicht', description: 'Vul je e-mailadres in.', variant: 'destructive' })
      return
    }
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      toast({ title: 'Magic link verzonden', description: NEUTRAL_MAGIC_LINK_MESSAGE })
    } catch (err) {
      // Dezelfde neutrale melding als bij succes: niet lekken welk adres bestaat.
      console.error('Magic link kon niet worden verzonden:', err)
      toast({ title: 'Magic link verzonden', description: NEUTRAL_MAGIC_LINK_MESSAGE })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="naam@organisatie.nl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Inloggen...' : 'Inloggen'}
      </Button>
      <Button type="button" variant="outline" disabled={isLoading} onClick={handleMagicLink}>
        Stuur magic link
      </Button>
    </form>
  )
}
