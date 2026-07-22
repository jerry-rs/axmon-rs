import * as React from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { NavBar } from '@/components/nav-bar'
import { useHealthCheck } from '@/hooks/use-health-check'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  useHealthCheck()

  return (
    <React.Fragment>
      <NavBar />
      <main>
        <Outlet />
      </main>
    </React.Fragment>
  )
}
