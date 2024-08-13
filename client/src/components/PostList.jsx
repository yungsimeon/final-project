import { useEffect } from "react";
import Post from "./Post";
import PostSkeleton from "./PostSkeleton";
import { useQuery } from "@tanstack/react-query";

const PostList = ({ feedType }) => {
  const getPostEndpoint = () => {
    if (feedType === "forYou") {
      return "/api/posts/";
    } else if (feedType === "following") {
      return "/api/posts/following";
    } else {
      return "/api/posts/";
    }
  };

  const POST_ENDPOINT = getPostEndpoint();

  const {
    data: posts,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        const res = await fetch(POST_ENDPOINT, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error);
        }
        return data;
      } catch (error) {
        throw new Error(error);
      }
    },
  });

  useEffect(() => {
    refetch();
  }, [feedType, refetch]);

  return (
    <>
      {(isLoading || isRefetching) && (
        <div className="flex flex-col justify-center">
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      )}
      {(!isLoading || !isRefetching) && posts?.length === 0 && (
        <p className="text-center my-4">No posts in this tab. Switch 👻</p>
      )}
      {(!isLoading || !isRefetching) && posts && (
        <div>
          {posts.map((post) => (
            <Post key={post._id} post={post} />
          ))}
        </div>
      )}
    </>
  );
};
export default PostList;
