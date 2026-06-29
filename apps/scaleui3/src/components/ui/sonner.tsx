"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useActiveDirection } from "@/components/active-direction"

function mirrorPosition(position: ToasterProps["position"], direction: "ltr" | "rtl"): ToasterProps["position"] {
  if (direction === "ltr" || !position) return position
  if (position.endsWith("-left")) return position.replace("-left", "-right") as ToasterProps["position"]
  if (position.endsWith("-right")) return position.replace("-right", "-left") as ToasterProps["position"]
  return position
}

const Toaster = ({ position = "bottom-right", ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const { direction } = useActiveDirection()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir={direction}
      position={mirrorPosition(position, direction)}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
