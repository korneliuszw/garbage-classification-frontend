import { writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const uuid = crypto.randomUUID()
  const filename = `${Date.now()}-${uuid}-${file.name}`
  const filePath = path.join(process.cwd(), 'uploads', filename)

  await writeFile(filePath, buffer)

  return NextResponse.json({ url: `/uploads/${filename}` })
}