
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { classMap } from '@/app/constants'


export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const label = formData.get('label') as string

  if (!file || !label || !classMap.includes(label)) {
    return NextResponse.json({ error: 'No data' }, { status: 400 })
  }


  const buffer = Buffer.from(await file.arrayBuffer())
  const uuid = crypto.randomUUID()
  const filename = `${Date.now()}-${uuid}-${file.name}`
  
  const dir = path.join(process.cwd(), 'uploads', 'labeled', label)
  await mkdir(dir, {recursive: true})
  const filePath = path.join(dir, filename)

  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/uploads/${filename}` })
}