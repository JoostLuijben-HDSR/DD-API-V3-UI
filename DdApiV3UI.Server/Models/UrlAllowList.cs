namespace DdApiV3UI.Server.Models
{
	/// <summary>
	/// Checks that a URL lies under one of the configured base URLs, so the server only
	/// forwards requests to the DD-API services it is set up for and cannot be used as an
	/// open proxy to other hosts.
	/// </summary>
	public static class UrlAllowList
	{
		public static bool IsAllowed(string? url, IEnumerable<string> baseUrls)
		{
			if (!Uri.TryCreate(url, UriKind.Absolute, out var target))
			{
				return false;
			}

			if (target.Scheme != Uri.UriSchemeHttps && target.Scheme != Uri.UriSchemeHttp)
			{
				return false;
			}

			if (!string.IsNullOrEmpty(target.UserInfo) || Uri.UnescapeDataString(target.AbsolutePath).Contains(".."))
			{
				return false;
			}

			foreach (var baseUrl in baseUrls)
			{
				if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var allowed))
				{
					continue;
				}

				var sameServer = string.Equals(target.Scheme, allowed.Scheme, StringComparison.OrdinalIgnoreCase)
					&& string.Equals(target.Host, allowed.Host, StringComparison.OrdinalIgnoreCase)
					&& target.Port == allowed.Port;
				if (!sameServer)
				{
					continue;
				}

				var basePath = allowed.AbsolutePath.TrimEnd('/');
				var path = target.AbsolutePath;
				if (path.Equals(basePath, StringComparison.Ordinal) || path.StartsWith(basePath + "/", StringComparison.Ordinal))
				{
					return true;
				}
			}

			return false;
		}
	}
}
