import type { CSSProperties } from 'react';
import type { IconType } from 'react-icons';
import {
  IoAdd,
  IoAlertCircle,
  IoRadioButtonOff,
  IoRadioButtonOn,
  IoArrowDown,
  IoArrowForward,
  IoArrowUp,
  IoBackspaceOutline,
  IoBusiness,
  IoBusinessOutline,
  IoCard,
  IoCardOutline,
  IoChatbubbleEllipsesOutline,
  IoCheckmark,
  IoCheckmarkCircle,
  IoChevronBack,
  IoChevronDown,
  IoChevronForward,
  IoChevronUp,
  IoClose,
  IoEarth,
  IoEllipseOutline,
  IoEye,
  IoEyeOff,
  IoFlash,
  IoHome,
  IoHomeOutline,
  IoList,
  IoListOutline,
  IoLockClosed,
  IoLockOpen,
  IoPeople,
  IoPeopleOutline,
  IoPersonCircle,
  IoPersonCircleOutline,
  IoQrCode,
  IoQrCodeOutline,
  IoReceiptOutline,
  IoSearch,
  IoSearchOutline,
  IoSettings,
  IoSettingsOutline,
  IoShieldCheckmark,
  IoShieldOutline,
  IoSparklesOutline,
  IoStorefront,
  IoStorefrontOutline,
  IoSwapHorizontal,
  IoTime,
  IoTrashOutline,
  IoWallet,
} from 'react-icons/io5';

const icons = {
  add: IoAdd,
  'alert-circle': IoAlertCircle,
  'radio-button-off': IoRadioButtonOff,
  'radio-button-on': IoRadioButtonOn,
  'arrow-down': IoArrowDown,
  'arrow-forward': IoArrowForward,
  'arrow-up': IoArrowUp,
  'backspace-outline': IoBackspaceOutline,
  business: IoBusiness,
  'business-outline': IoBusinessOutline,
  card: IoCard,
  'card-outline': IoCardOutline,
  'chatbubble-ellipses-outline': IoChatbubbleEllipsesOutline,
  checkmark: IoCheckmark,
  'checkmark-circle': IoCheckmarkCircle,
  'chevron-back': IoChevronBack,
  'chevron-down': IoChevronDown,
  'chevron-forward': IoChevronForward,
  'chevron-up': IoChevronUp,
  close: IoClose,
  earth: IoEarth,
  'ellipse-outline': IoEllipseOutline,
  eye: IoEye,
  'eye-off': IoEyeOff,
  flash: IoFlash,
  home: IoHome,
  'home-outline': IoHomeOutline,
  list: IoList,
  'list-outline': IoListOutline,
  'lock-closed': IoLockClosed,
  'lock-open': IoLockOpen,
  people: IoPeople,
  'people-outline': IoPeopleOutline,
  'person-circle': IoPersonCircle,
  'person-circle-outline': IoPersonCircleOutline,
  'qr-code': IoQrCode,
  'qr-code-outline': IoQrCodeOutline,
  'receipt-outline': IoReceiptOutline,
  search: IoSearch,
  'search-outline': IoSearchOutline,
  settings: IoSettings,
  'settings-outline': IoSettingsOutline,
  'shield-checkmark': IoShieldCheckmark,
  'shield-outline': IoShieldOutline,
  'sparkles-outline': IoSparklesOutline,
  storefront: IoStorefront,
  'storefront-outline': IoStorefrontOutline,
  'swap-horizontal': IoSwapHorizontal,
  time: IoTime,
  'trash-outline': IoTrashOutline,
  wallet: IoWallet,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof icons;

export function Icon({
  name,
  size = 24,
  color,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      color={color}
      style={{ flexShrink: 0, ...style }}
      className={className}
      aria-hidden
    />
  );
}
