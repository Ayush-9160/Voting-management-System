create database voting;
use voting;
create table voters(
    id varchar(30) primary key,
    username varchar(30) unique,
    password varchar(30)
);
select * from voters;

CREATE TABLE Poll (
    poll_id varchar(30) PRIMARY KEY,
    id varchar(50),
    question VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES voters(id)
);

CREATE TABLE Options (
    option_id varchar(30) PRIMARY KEY,
    poll_id varchar(30) NOT NULL,
    option_text VARCHAR(255) NOT NULL,
    FOREIGN KEY (poll_id) REFERENCES Poll(poll_id)
);


CREATE TABLE Vote (
    vote_id varchar(30) PRIMARY KEY,
    id varchar(30),
    poll_id varchar(30) NOT NULL,
    option_id varchar(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES voters(id),
    FOREIGN KEY (poll_id) REFERENCES Poll(poll_id),
    FOREIGN KEY (option_id) REFERENCES Options(option_id)
);
