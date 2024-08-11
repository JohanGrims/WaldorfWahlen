import ListVotes from "./ListVotes";
import NewVote from "./NewVote";

export default function Overview() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-evenly",
        width: "100vw",
        boxSizing: "border-box",
      }}
    >
      <div className="button disabled">
        <NewVote />
      </div>
      <div className="button disabled">
        <ListVotes />
      </div>
    </div>
  );
}
