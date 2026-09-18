CREATE TABLE `network_memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`memberId` int NOT NULL,
	`userId` int NOT NULL,
	`accessLevel` enum('limited','full') NOT NULL DEFAULT 'limited',
	`status` enum('pending','active','revoked') NOT NULL DEFAULT 'pending',
	`matchMethod` enum('email','phone') NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `network_memberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `network_memberships_org_user_unique` UNIQUE(`orgId`,`userId`),
	CONSTRAINT `network_memberships_member_user_unique` UNIQUE(`memberId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `organizations` ADD `ownerUserId` int;