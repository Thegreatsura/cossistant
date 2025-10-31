type UsageBarProps = {
	label: string;
	current: number;
	limit: number | null;
	showBar?: boolean;
	formatValue?: (current: number, limit: number | null) => string;
};

function formatUsage(current: number, limit: number | null): string {
	if (limit === null) {
		return `${current.toLocaleString()} / Unlimited`;
	}

	return `${current.toLocaleString()} / ${limit.toLocaleString()}`;
}

function getUsagePercentage(current: number, limit: number | null): number {
	if (limit === null || limit === 0) {
		return 0;
	}

	return Math.min(100, Math.round((current / limit) * 100));
}

export function UsageBar({
	label,
	current,
	limit,
	showBar = true,
	formatValue = formatUsage,
}: UsageBarProps) {
	const percentage = getUsagePercentage(current, limit);
	const barWidth = percentage === 0 ? 0 : Math.max(percentage, 2); // Minimum 2% width (5px on 250px container)

	return (
		<div>
			<div className="mb-2 flex items-center justify-between text-sm">
				<span className="font-medium">{label}</span>
				<span className="text-primary/60">{formatValue(current, limit)}</span>
			</div>
			{showBar && limit !== null && (
				<div className="h-2 w-full overflow-hidden rounded-full bg-background-200 dark:bg-background-800">
					<div
						className="h-full bg-cossistant-blue transition-all"
						style={{
							width: `${barWidth}%`,
							minWidth: barWidth > 0 ? "5px" : "0px",
						}}
					/>
				</div>
			)}
		</div>
	);
}
