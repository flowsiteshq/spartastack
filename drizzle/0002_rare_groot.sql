CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`user` varchar(255) NOT NULL DEFAULT 'Lead Matrix Architect',
	`action` text NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'general',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_charts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`snapshot` text NOT NULL,
	`totalMembers` int NOT NULL DEFAULT 0,
	`filledPositions` int NOT NULL DEFAULT 0,
	`openPositions` int NOT NULL DEFAULT 0,
	`completionRate` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_charts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `placements` ADD `isLocked` boolean DEFAULT false NOT NULL;