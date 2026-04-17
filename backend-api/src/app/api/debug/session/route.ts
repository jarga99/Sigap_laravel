import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ status: 'No Session Found', headers: request.headers }, { status: 401 });
    }
    return Response.json({ status: 'Session Found', session });
  } catch (err: any) {
    return Response.json({ status: 'Error', message: err.message }, { status: 500 });
  }
}
