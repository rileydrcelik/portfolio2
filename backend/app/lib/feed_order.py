from sqlalchemy import case, desc


def feed_ordering(cols, sort_by: str = "date", pin_now_playing: bool = False):
    """ORDER BY terms for the posts feed; `cols` is the Post model (or any table
    with post_type, date and updated_at).

    The home feed pins the now-playing card first, whatever its date. Done in the
    ordering rather than on the client so it lands on the first page and later
    pages don't shift. A CASE rather than `post_type == ...` sorted DESC: the
    column is nullable, and Postgres puts NULLs first under DESC.
    """
    ordering = [case((cols.post_type == 'now_playing', 0), else_=1)] if pin_now_playing else []
    ordering.append(desc(cols.updated_at) if sort_by == 'updated_at' else desc(cols.date))
    return ordering
