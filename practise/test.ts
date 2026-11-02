import { MySqliteRequest } from "./MySqliteRequest.ts";

const result = await new MySqliteRequest()
    .delete()
    .from("practise/students-delete-test.csv")
    .where("name", "Alice")
    .run();

console.log(result);