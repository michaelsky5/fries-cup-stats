export default function OpeningMoveIcon({ move, className }) {
  return <svg className={className} viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {move === 'ROCK' && <><path d="m9 6 12-1 7 9-4 12-15 1-6-10Z" /><path d="m9 6 4 10 15-2M13 16l-4 11m4-11 11 10" /></>}
    {move === 'SCISSORS' && <><circle cx="8" cy="24" r="4" /><circle cx="24" cy="24" r="4" /><path d="m11 21 14-16-5 14M21 21 7 5l5 14" /><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none" /></>}
    {move === 'PAPER' && <path d="M12.4 28.5H23c0-2 2.8-5 3-7.8l1.4-8.4c.2-1.1-.5-2-1.5-2.1-1-.2-1.8.5-2 1.5L23 16l1-8.7c.2-1.1-.5-2-1.5-2.1-1-.1-1.8.6-2 1.6l-.8 8V4.8a1.9 1.9 0 0 0-3.8 0v10l-1.2-8.4c-.2-1.1-1.1-1.8-2.1-1.6-1 .2-1.7 1.1-1.5 2.2l1.3 12-4.3-4.8c-.7-.8-1.9-.9-2.7-.2s-.9 1.9-.2 2.7l4.6 6.7c1.4 1.9 2.4 3.3 2.6 5.1Z" />}
  </svg>
}
