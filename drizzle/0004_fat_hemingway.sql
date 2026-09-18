CREATE TABLE `communication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`memberId` int NOT NULL,
	`channel` enum('email','text') NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`subject` varchar(255),
	`message` text NOT NULL,
	`initiatedBy` varchar(255) NOT NULL DEFAULT 'Administrator',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communication_logs_id` PRIMARY KEY(`id`)
);
