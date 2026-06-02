'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Instellingen</h1>
      <p className="text-muted-foreground mb-8">Beheer je workspace configuratie</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/settings/db">
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                Database Connections
              </CardTitle>
              <CardDescription>
                Koppel externe PostgreSQL-databases voor dynamische CRUD-formulieren
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
