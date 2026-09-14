/**
 * Inventário de ícones do app — único ponto de entrada de ícone.
 *
 * A lista do lucide é NOMEADA de propósito. `export * from "lucide-react"`
 * reexportava o barrel inteiro (~1500 módulos) e, por ser um barrel local,
 * ficava fora do `optimizePackageImports` que o Next aplica ao especificador
 * `lucide-react` — a otimização casa pelo nome do pacote, não pelo módulo que o
 * reexporta. Além do custo, `export *` abria colisão silenciosa de nome com o
 * design system (`Table`, `Menu`, `Link`, `Circle` existem nos dois lados).
 *
 * Precisa de um ícone novo? Acrescente o nome aqui — é o único lugar.
 */
export {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  ChartPie,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  CircleHelp,
  ClipboardList,
  Clock,
  CreditCard,
  Edit3,
  Eye,
  FileClock,
  FileEdit,
  FileText,
  Filter,
  History,
  Info,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Moon,
  PackageX,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Scale,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

export type { LucideIcon } from "lucide-react";

// Glifos de marca (WhatsApp, etc.) não existem no lucide, que não distribui
// logotipos de terceiros. Entram por aqui para o app manter um único ponto de
// entrada de ícone — nenhuma feature desenha `<svg>` no meio do JSX.
export { WhatsappIcon } from "./brand-icons";
