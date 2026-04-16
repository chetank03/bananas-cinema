import { useEffect, useRef, useState } from "react";
import { StarRating } from "./StarRating";

function formatRating(value) {
  if (!value) {
    return "NR";
  }
  return value.toFixed(1);
}


export function MediaGrid({
  items,
  emptyMessage,
  onOpenDetails,
  onToggleFavorite,
  isFavorite,
  compact = false,
  slider = false,
  itemActions,
}) {
  const sliderRef = useRef(null);
  const animationFrameRef = useRef(null);
  const loopReadyRef = useRef(false);
  const firstCardRef = useRef(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!slider) {
      return undefined;
    }

    function updateLoopMode() {
      if (!sliderRef.current || !firstCardRef.current) {
        return;
      }

      const trackStyles = window.getComputedStyle(sliderRef.current);
      const columnGap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0") || 0;
      const cardWidth = firstCardRef.current.getBoundingClientRect().width;
      const originalContentWidth = cardWidth * items.length + columnGap * Math.max(0, items.length - 1);
      const shouldLoop = items.length > 1 && originalContentWidth - sliderRef.current.clientWidth > 4;

      setLoopEnabled((current) => (current !== shouldLoop ? shouldLoop : current));
    }

    updateLoopMode();
    window.addEventListener("resize", updateLoopMode);

    let resizeObserver;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateLoopMode);
      if (sliderRef.current) {
        resizeObserver.observe(sliderRef.current);
      }
      if (firstCardRef.current) {
        resizeObserver.observe(firstCardRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", updateLoopMode);
      resizeObserver?.disconnect();
    };
  }, [items, slider]);

  useEffect(() => {
    if (!slider) {
      return undefined;
    }

    loopReadyRef.current = false;

    function recenterLoop(force = false) {
      if (!sliderRef.current || !loopEnabled || items.length < 2) {
        return;
      }

      const segmentWidth = sliderRef.current.scrollWidth / 3;
      if (!segmentWidth) {
        return;
      }

      if (force && !loopReadyRef.current) {
        sliderRef.current.scrollLeft = segmentWidth;
        loopReadyRef.current = true;
        return;
      }

      const { scrollLeft } = sliderRef.current;
      if (scrollLeft < segmentWidth * 0.5) {
        sliderRef.current.scrollLeft = scrollLeft + segmentWidth;
      } else if (scrollLeft > segmentWidth * 1.5) {
        sliderRef.current.scrollLeft = scrollLeft - segmentWidth;
      }
    }

    function updateScrollState() {
      if (!sliderRef.current) {
        return;
      }

      recenterLoop();
      const { scrollWidth, clientWidth } = sliderRef.current;
      const isScrollable = scrollWidth - clientWidth > 4;
      setCanScrollLeft(isScrollable);
      setCanScrollRight(isScrollable);
    }

    if (loopEnabled) {
      recenterLoop(true);
    }
    updateScrollState();

    const track = sliderRef.current;
    track?.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    let resizeObserver;
    if (track && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(track);
    }

    return () => {
      track?.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [items, slider, loopEnabled]);

  if (!items.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  function scrollSlider(direction) {
    if (!sliderRef.current) {
      return;
    }

    const firstCard = sliderRef.current.querySelector(".media-card-slider");
    if (!firstCard) {
      return;
    }

    const trackStyles = window.getComputedStyle(sliderRef.current);
    const columnGap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0") || 0;
    const cardWidth = firstCard.getBoundingClientRect().width;
    const step = cardWidth + columnGap;
    const visibleCards = Math.max(1, Math.floor(sliderRef.current.clientWidth / step));
    const cardsPerJump = Math.max(2, visibleCards - 1);
    const startLeft = sliderRef.current.scrollLeft;
    const targetLeft = startLeft + direction * step * cardsPerJump;

    const distance = targetLeft - startLeft;

    if (Math.abs(distance) < 2) {
      return;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      sliderRef.current.scrollLeft = targetLeft;
      return;
    }

    const durationMs = 600;
    const startTime = window.performance.now();

    function easeInOutCubic(progress) {
      return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    }

    function animateFrame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeInOutCubic(progress);
      sliderRef.current.scrollLeft = startLeft + distance * easedProgress;

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animateFrame);
      } else {
        animationFrameRef.current = null;
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(animateFrame);
  }

  const cardClassName = `media-card${compact ? " media-card-compact" : ""}${slider ? " media-card-slider" : ""}`;
  const posterClassName = `media-poster${compact ? " media-poster-compact" : ""}`;
  const bodyClassName = `media-body${compact ? " media-body-compact" : ""}`;
  const renderCard = (item, key, isMeasureCard = false) => (
    <article
      className={cardClassName}
      key={key}
      ref={isMeasureCard ? firstCardRef : null}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(item);
        }
      }}
    >
      <div className={posterClassName}>
        {item.poster_url ? <img src={item.poster_url} alt={item.title} loading="lazy" /> : null}
        <span className="media-type-badge">{item.media_type === "movie" ? "Movie" : "TV"}</span>
        <button
          className="favorite-chip"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(item);
          }}
          aria-label={isFavorite(item) ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite(item) ? "★" : "☆"}
        </button>
      </div>

      <div className={bodyClassName}>
        <div className="media-body-main">
          <h3>{item.title}</h3>
        </div>
        <div className="media-body-footer">
          <div className="meta-row">
            <span>{item.year || "TBA"}</span>
            <span>{formatRating(item.rating)} / 10</span>
          </div>
          {item.watch_later ? <div className="watch-later-badge">Watch later</div> : null}
          {item.personal_rating ? (
            <div className="personal-rating-badge">
              <span className="personal-rating-label">Your rating</span>
              <div className="personal-rating-value">
                <StarRating value={item.personal_rating} size="sm" />
                <span>{item.personal_rating}/5</span>
              </div>
            </div>
          ) : null}
          {itemActions ? (
            <div className="media-card-actions" onClick={(event) => event.stopPropagation()} role="presentation">
              {itemActions(item)}
            </div>
          ) : null}
        </div>
        {!compact ? (
          <p className="overview">{item.overview ? `${item.overview.slice(0, 120)}...` : "No synopsis available."}</p>
        ) : null}
      </div>
    </article>
  );

  const renderedItems = slider && loopEnabled ? [0, 1, 2].flatMap((copyIndex) =>
    items.map((item) => ({
      item,
      key: `${copyIndex}-${item.media_type}-${item.id}`,
    })),
  ) : items.map((item) => ({
    item,
    key: `0-${item.media_type}-${item.id}`,
  }));

  if (slider) {
    return (
      <div className="media-slider-shell">
        {canScrollLeft ? (
          <button className="slider-button slider-button-left" type="button" onClick={() => scrollSlider(-1)} aria-label="Scroll left">
            ‹
          </button>
        ) : null}
        <div className="media-slider-track" ref={sliderRef}>
          {renderedItems.map(({ item, key }, index) => renderCard(item, key, index === 0))}
        </div>
        {canScrollRight ? (
          <button className="slider-button slider-button-right" type="button" onClick={() => scrollSlider(1)} aria-label="Scroll right">
            ›
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`media-grid${compact ? " media-grid-compact" : ""}`}>
      {renderedItems.map(({ item, key }) => renderCard(item, key))}
    </div>
  );
}
