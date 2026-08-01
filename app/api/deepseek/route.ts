import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const userMessage = body.message;

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "user", content: userMessage }
      ]
    })
  });

  const data = await response.json();
  return NextResponse.json(data);
}
