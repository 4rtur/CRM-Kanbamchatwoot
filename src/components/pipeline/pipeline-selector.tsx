'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePipelineStore } from '@/lib/store/pipeline-store'

export function PipelineSelector() {
  const { pipelines, activePipelineId, setActivePipeline } = usePipelineStore()

  return (
    <Tabs value={activePipelineId} onValueChange={setActivePipeline}>
      <TabsList variant="line">
        {pipelines.map((pipeline) => (
          <TabsTrigger key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
