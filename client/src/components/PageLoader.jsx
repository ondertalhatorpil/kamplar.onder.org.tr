import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const MIN_VISIBLE_MS = 700;

export default function PageLoader() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      className={`page-loader-overlay${visible ? '' : ' loader-hidden'}`}
      aria-hidden={!visible}
    >
      <div className="custom-loader"></div>
    </div>
  );
}
