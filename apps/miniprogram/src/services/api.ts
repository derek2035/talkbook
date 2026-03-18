const BASE_URL = 'http://localhost:3000/api/v1';

export function postSession(bookType: string) {
  return uni.request({
    url: `${BASE_URL}/sessions`,
    method: 'POST',
    data: { bookType }
  });
}

export function getPreview(sessionId: string) {
  return uni.request({
    url: `${BASE_URL}/sessions/${sessionId}/generate-preview`,
    method: 'POST'
  });
}
