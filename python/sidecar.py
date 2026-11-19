"""TiffGetter Python sidecar 薄适配器。

把 TiffGetter-Contract 加入 sys.path 后启动其内部 sidecar 循环；
协议为 stdin/stdout JSON 行，供 TiffGetter-Go 的 sidecar 客户端调用。
"""
import os
import sys


def contract_path() -> str:
    """返回 TiffGetter-Contract 的根目录。

    Returns:
        优先使用环境变量 TIFFGETTER_CONTRACT_PATH；否则取项目平级目录。
    """
    configured = os.environ.get('TIFFGETTER_CONTRACT_PATH')
    if configured:
        return configured
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.abspath(os.path.join(project_root, '..', 'TiffGetter-Contract'))


def main() -> None:
    """把契约项目加入模块搜索路径并运行 sidecar 服务。"""
    root = contract_path()
    if root not in sys.path:
        sys.path.insert(0, root)
    from tiffgetter.sidecar import serve

    serve()


if __name__ == '__main__':
    main()
