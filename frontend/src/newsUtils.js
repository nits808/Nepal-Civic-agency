export function articleLocation(article) {
  const parts = [article?.district, article?.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Nepal (inferred)';
}
