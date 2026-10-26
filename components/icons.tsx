import type { SVGProps } from 'react'

// Iconos de línea (estilo Lucide) para no añadir otra librería.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

export const PhoneIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></Icon>
)
export const ChatIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></Icon>
)
export const MapPinIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></Icon>
)
export const ClockIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>
)
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>
)
export const CalendarIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>
)
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></Icon>
)
export const XIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>
)
export const ArrowLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>
)
export const ArrowRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M5 12h14M12 5l7 7-7 7" /></Icon>
)
export const NavigationIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m3 11 19-9-9 19-2-8-8-2Z" /></Icon>
)
export const ScissorsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" /></Icon>
)
export const LogOutIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>
)
export const BellIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Icon>
)
export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
)
export const ShareIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></Icon>
)
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
)
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></Icon>
)
export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></Icon>
)
export const BanIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></Icon>
)
export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
)
export const UsersIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></Icon>
)
export const ChartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-3" /></Icon>
)
export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" /></Icon>
)
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Icon>
)
