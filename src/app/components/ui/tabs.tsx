"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

type TabsVariant = "default" | "line";

const TabsVariantContext = React.createContext<TabsVariant>("default");

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        className={cn(
          variant === "line"
            ? "inline-flex items-center border-b border-white/[0.06]"
            : "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
          className,
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        variant === "line"
          ? "px-3 py-2 text-[11px] font-medium cursor-pointer text-white/40 transition-[color,box-shadow] duration-150 ease-out hover:text-white/60 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(255,255,255,0.8)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25"
          : "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
