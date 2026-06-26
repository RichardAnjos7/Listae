import type { SVGProps } from "react";

export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.2 5h2.1L6 8" />
      <path d="M6 8h13l-2.4 7.4H8.4L6 8Z" />
      <path d="M7.2 11.4h10.6" />
      <path d="M10.4 8 10 15.4M14.6 8l.4 7.4" />
      <circle cx="9.8" cy="18.3" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="18.3" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
