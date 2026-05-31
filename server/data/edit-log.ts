export interface EditLogEntry {
  path: string
  date: string
  newH2: number
  charGrowth: number
}

export const editLog: EditLogEntry[] = [
  {
    path: "/home/helloctfos/blog-v3/content/posts/2026/Pwn_ret2text.md",
    date: "2026-05-31",
    newH2: 2,
    charGrowth: 2303
  }
]
