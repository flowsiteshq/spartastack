CREATE TABLE `password_credentials` (
	`openId` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text NOT NULL,
	`resetTokenHash` varchar(128),
	`resetExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `password_credentials_openId` PRIMARY KEY(`openId`),
	CONSTRAINT `password_credentials_email_unique` UNIQUE(`email`)
);
