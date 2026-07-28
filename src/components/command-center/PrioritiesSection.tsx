'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { usePriorities, useSavePriorities } from '@/hooks/usePriorities'
import { Target, Save } from 'lucide-react'

export function PrioritiesSection() {
  const { data: priorities, isLoading } = usePriorities()
  const saveMutation = useSavePriorities()
  const { toast } = useToast()

  const [item1, setItem1] = useState('')
  const [item2, setItem2] = useState('')
  const [item3, setItem3] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (priorities && !hydrated) {
      setItem1(priorities.item_1)
      setItem2(priorities.item_2)
      setItem3(priorities.item_3)
      setHydrated(true)
    }
  }, [priorities, hydrated])

  const isDirty =
    priorities &&
    (item1 !== priorities.item_1 ||
      item2 !== priorities.item_2 ||
      item3 !== priorities.item_3)

  const handleSave = () => {
    saveMutation.mutate(
      { item_1: item1, item_2: item2, item_3: item3 },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast({ title: 'Prioriteiten opgeslagen' })
          } else {
            toast({ title: 'Fout', description: result.error, variant: 'destructive' })
          }
        },
        onError: (err) => {
          toast({ title: 'Fout', description: err.message, variant: 'destructive' })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Top 3 prioriteiten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-muted/50 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Top 3 prioriteiten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">1</label>
          <Input
            value={item1}
            onChange={(e) => setItem1(e.target.value)}
            placeholder="Wat is je belangrijkste focus?"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">2</label>
          <Input
            value={item2}
            onChange={(e) => setItem2(e.target.value)}
            placeholder="Tweede prioriteit"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">3</label>
          <Input
            value={item3}
            onChange={(e) => setItem3(e.target.value)}
            placeholder="Derde prioriteit"
          />
        </div>
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Opslaan
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}