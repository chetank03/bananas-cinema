function fillPercent(value, index) {
  if (value >= index) {
    return 100;
  }
  if (value >= index - 0.5) {
    return 50;
  }
  return 0;
}


export function StarRating({ value, size = "md" }) {
  const normalized = Number(value) || 0;

  return (
    <span className={`star-rating star-rating-${size}`} aria-label={`${normalized} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <span className="star-rating-item" key={index}>
          <span className="star-rating-base">★</span>
          <span className="star-rating-fill" style={{ width: `${fillPercent(normalized, index)}%` }}>
            <span className="star-rating-glyph">★</span>
          </span>
        </span>
      ))}
    </span>
  );
}
