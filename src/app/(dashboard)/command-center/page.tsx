'use client'

import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Bot, BookOpen, Users, ClipboardList } from 'lucide-react'

export default function CommandCenterPage() {
  const { profile } = useAuthStore()

  const stats = { assistants: '-', knowledgeBases: '-', teamMembers: '-' }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Welkom terug, {profile?.full_name?.split(' ')[0] ?? 'gebruiker'}</h1>
      <p className="text-muted-foreground mb-8">Hier is een overzicht van je omgeving</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assistenten</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.assistants}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kennisbronnen</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.knowledgeBases}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Teamleden</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.teamMembers}</p></CardContent>
        </Card>
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taken</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Binnenkort beschikbaar</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
