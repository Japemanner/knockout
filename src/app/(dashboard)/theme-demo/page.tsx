'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ThemeToggleSelect } from '@/components/theme/ThemeToggleSelect'

export default function ThemeDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Thema Demo</h1>
        <p className="text-muted-foreground">Test de donkere en lichte modus functionaliteit</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Toggle</CardTitle>
            <CardDescription>
              Schakel snel tussen licht en donker thema
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selecteer Thema</CardTitle>
            <CardDescription>
              Kies uit licht, donker of systeem voorkeur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggleSelect />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>UI Elementen Demo</CardTitle>
          <CardDescription>
            Voorbeeld van verschillende UI elementen in het huidige thema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          
          <div className="p-4 rounded-lg border bg-card text-card-foreground">
            <h3 className="font-medium mb-2">Card Voorbeeld</h3>
            <p className="text-muted-foreground">
              Dit is een voorbeeld van een card component met de huidige thema kleuren.
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded bg-primary text-primary-foreground">Primary</div>
            <div className="p-2 rounded bg-secondary text-secondary-foreground">Secondary</div>
            <div className="p-2 rounded bg-muted text-muted-foreground">Muted</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}