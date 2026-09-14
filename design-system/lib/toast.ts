import { toast as baseToast, type ExternalToast, type ToastT } from "sonner";

type ToastMessage = Parameters<typeof baseToast>[0];
type ToastData = ExternalToast | undefined;

const DEFAULT_POSITION = "top-right" as const;
const DEFAULT_TITLES = {
  success: "Sucesso",
  error: "Erro",
  info: "Info",
  warning: "Aviso",
} as const;

function hasDescription(
  data: ExternalToast,
): data is ExternalToast & {
  description: NonNullable<ExternalToast["description"]>;
} {
  return Boolean(data.description != null);
}

function withDefaults(data?: ToastData): ExternalToast {
  if (data && typeof data === "object") {
    const { position: _ignoredPosition, ...rest } = data;
    return { ...rest, position: DEFAULT_POSITION };
  }

  return { position: DEFAULT_POSITION };
}

const toast = Object.assign(
  ((message: ToastMessage, data?: ToastData) =>
    baseToast(message, withDefaults(data))) as typeof baseToast,
  baseToast,
);

toast.success = (message, data) => {
  const options = withDefaults(data);
  if (hasDescription(options)) return baseToast.success(message, options);
  return baseToast.success(DEFAULT_TITLES.success, {
    ...options,
    description: message,
  });
};

toast.error = (message, data) => {
  const options = withDefaults(data);
  if (hasDescription(options)) return baseToast.error(message, options);
  return baseToast.error(DEFAULT_TITLES.error, {
    ...options,
    description: message,
  });
};

toast.info = (message, data) => {
  const options = withDefaults(data);
  if (hasDescription(options)) return baseToast.info(message, options);
  return baseToast.info(DEFAULT_TITLES.info, {
    ...options,
    description: message,
  });
};

toast.warning = (message, data) => {
  const options = withDefaults(data);
  if (hasDescription(options)) return baseToast.warning(message, options);
  return baseToast.warning(DEFAULT_TITLES.warning, {
    ...options,
    description: message,
  });
};

export { toast };
export type { ExternalToast, ToastT };
