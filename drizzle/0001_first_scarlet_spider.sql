CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(64),
	`avatarUrl` text,
	`rank` varchar(64) NOT NULL DEFAULT 'Associate',
	`personalVolume` int NOT NULL DEFAULT 100,
	`joinDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(191) NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` text,
	`matrixWidth` int NOT NULL DEFAULT 3,
	`matrixDepth` int NOT NULL DEFAULT 5,
	`blueprintCode` varchar(64) NOT NULL DEFAULT 'SEC-3X5-ALPHA',
	`logoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `placements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`memberId` int NOT NULL,
	`parentId` int,
	`level` int NOT NULL,
	`positionIndex` int NOT NULL,
	`slotCoordinate` varchar(128) NOT NULL,
	`placedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	CONSTRAINT `placements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'admin';