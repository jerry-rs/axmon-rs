export interface Image {
  id: string
  repoTags: string[]
  created: number
  size: number
  sharedSize: number
}

export interface DockerImages {
  timestamp: number
  images: Image[]
}

export interface Port {
  ip?: string | null
  privatePort: number
  publicPort?: number | null
  type?: 'tcp' | 'udp' | 'sctp' | '' | null
}

export interface Container {
  id: string | null
  names: string[] | null
  image: string | null
  command: string | null
  created: number | null
  sizeRw: number | null
  sizeRootFs: number | null
  state: string
  status: string | null
  ports: Port[] | null
}

export interface DockerContainers {
  timestamp: number
  containers: Container[]
}
