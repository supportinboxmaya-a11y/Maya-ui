import { motion } from "framer-motion";

import { Logo } from "@/components/Common/Logo";
import { ChatInput } from "@/components/Input/ChatInput";
import { InputToolbar } from "@/components/Input/InputToolbar";
import { ModelPicker } from "@/components/Model/ModelPicker";
import { ModelBadge } from "@/components/Status/ModelBadge";

export function ChatPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto scrollbar-hidden">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex min-h-full flex-col items-center justify-center gap-8 px-6"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
              className="flex size-16 items-center justify-center rounded-[1.4rem] border border-border-subtle bg-surface-elevated"
            >
              <Logo className="size-9" />
            </motion.div>

            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Welcome to Maya
            </h1>
            <p className="max-w-[240px] text-sm leading-relaxed text-foreground-muted">
              Your premium AI workspace — ask anything, build anything.
            </p>

            <ModelBadge />
          </div>

          <ModelPicker />
        </motion.section>
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-background/80 backdrop-blur-xl">
        <InputToolbar />
        <ChatInput />
      </div>
    </div>
  );
}
