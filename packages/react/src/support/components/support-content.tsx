"use client";

import { motion } from "motion/react";
import type React from "react";
import { useMultimodalInput } from "../../hooks/use-multimodal-input";

import { SupportRouter } from "../router";
import { cn } from "../utils";
import { Bubble } from "./bubble";
import { Container } from "./container";

interface SupportContentProps {
	className?: string;
	position?: "top" | "bottom";
	align?: "right" | "left";
	mode?: "floating" | "responsive";
}

export const SupportContent: React.FC<SupportContentProps> = ({
	className,
	position = "bottom",
	align = "right",
	mode = "floating",
}) => {
	const {
		message,
		files,
		isSubmitting,
		error,
		setMessage,
		addFiles,
		removeFile,
		submit,
	} = useMultimodalInput({
		onSubmit: async (data) => {},
		onError: () => {},
	});

	const containerClasses = cn(
		"cossistant",
		{
			// Floating mode positioning
			"fixed z-[9999]": mode === "floating",
			"bottom-4": mode === "floating" && position === "bottom",
			"top-4": mode === "floating" && position === "top",
			"right-4": mode === "floating" && align === "right",
			"left-4": mode === "floating" && align === "left",
			// Responsive mode
			"relative h-full w-full": mode === "responsive",
		},
		className,
	);

	return (
		<motion.div
			animate={{ opacity: 1 }}
			className={containerClasses}
			initial={{ opacity: 0 }}
			layout="position"
			transition={{
				default: { ease: "anticipate" },
				layout: { duration: 0.3 },
			}}
		>
			{mode === "floating" && <Bubble className="z-[1000] md:z-[9999]" />}
			<Container align={align} mode={mode} position={position}>
				<SupportRouter
					addFiles={addFiles}
					error={error}
					files={files}
					isSubmitting={isSubmitting}
					message={message}
					removeFile={removeFile}
					setMessage={setMessage}
					submit={submit}
				/>
			</Container>
		</motion.div>
	);
};
